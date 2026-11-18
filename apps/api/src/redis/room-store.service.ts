import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AppError } from '../common/app-error';
import { RedisService } from './redis.service';

const ROOM_TTL_SECONDS = 24 * 60 * 60;
const LOCK_TTL_MS = 5000;
const LOCK_WAIT_MS = 3500;
const LOCK_RETRY_MS = 40;

const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class RoomStoreService {
  private readonly logger = new Logger(RoomStoreService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly memoryLocks = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  private roomKey(code: string): string {
    return `jackaroo:room:${code}`;
  }

  private lockKey(code: string): string {
    return `jackaroo:lock:room:${code}`;
  }

  async getRoomJson(code: string): Promise<string | null> {
    if (this.redis.isAvailable) {
      try {
        const value = await this.redis.raw?.get(this.roomKey(code));
        if (value) return value;
      } catch (error) {
        this.logger.warn(
          `Redis read failed for room ${code}; using memory fallback: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    const entry = this.memory.get(code);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.memory.delete(code);
      return null;
    }
    return entry.value;
  }

  async saveRoomJson(code: string, json: string): Promise<void> {
    this.memory.set(code, { value: json, expiresAt: Date.now() + ROOM_TTL_SECONDS * 1000 });
    if (this.redis.isAvailable) {
      try {
        await this.redis.raw?.set(this.roomKey(code), json, 'EX', ROOM_TTL_SECONDS);
      } catch (error) {
        this.logger.warn(
          `Redis write failed for room ${code}; memory copy retained: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async deleteRoom(code: string): Promise<void> {
    this.memory.delete(code);
    if (this.redis.isAvailable) {
      try {
        await this.redis.raw?.del(this.roomKey(code));
      } catch {
        // Best effort; TTL cleans up.
      }
    }
  }

  /**
   * Test-only: simulates losing the Redis room snapshot so the next read has
   * to recover the room from the durable database snapshot.
   */
  clearMemoryForTests(): void {
    this.memory.clear();
  }

  /**
   * Serializes all mutations for a room. Uses a distributed Redis lock when
   * available, otherwise a per-process promise queue.
   */
  async withLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    if (!this.redis.isAvailable) {
      return this.withMemoryLock(code, fn);
    }

    const token = randomUUID();
    const started = Date.now();
    let acquired = false;
    while (Date.now() - started < LOCK_WAIT_MS) {
      try {
        const result = await this.redis.raw?.set(
          this.lockKey(code),
          token,
          'PX',
          LOCK_TTL_MS,
          'NX',
        );
        if (result === 'OK') {
          acquired = true;
          break;
        }
      } catch (error) {
        this.logger.warn(
          `Redis lock error; using local queue: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return this.withMemoryLock(code, fn);
      }
      await delay(LOCK_RETRY_MS);
    }
    if (!acquired) {
      throw new AppError(
        'ROOM_LOCK_TIMEOUT',
        'The room is busy. Please try again.',
        409,
      );
    }

    try {
      return await fn();
    } finally {
      try {
        await this.redis.raw?.eval(RELEASE_LOCK_SCRIPT, 1, this.lockKey(code), token);
      } catch {
        // The lock expires automatically.
      }
    }
  }

  private async withMemoryLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
    const previous = this.memoryLocks.get(code) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(fn);
    this.memoryLocks.set(code, current);
    try {
      return await current;
    } finally {
      if (this.memoryLocks.get(code) === current) {
        this.memoryLocks.delete(code);
      }
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
