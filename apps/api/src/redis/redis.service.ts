import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private available = false;

  constructor(private readonly config: AppConfigService) {
    if (config.redisUrl) {
      this.client = new Redis(config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        retryStrategy: (times) => Math.min(times * 100, 2000),
      });
      this.client.on('error', (error) => {
        if (this.available) {
          this.logger.warn(`Redis connection error: ${error.message}`);
        }
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.warn('REDIS_URL is not set — using in-memory room coordination (single instance only).');
      return;
    }
    await this.connectNow();
  }

  /** Connects eagerly so adapters can use Redis before Nest's lifecycle init. */
  async connectNow(): Promise<boolean> {
    if (!this.client) return false;
    if (this.client.status === 'ready') {
      this.available = true;
      return true;
    }
    if (this.client.status === 'connecting') {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2000);
        this.client?.once('ready', () => {
          clearTimeout(timer);
          resolve();
        });
        this.client?.once('error', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    } else {
      try {
        await this.client.connect();
      } catch (error) {
        this.available = false;
        this.logger.error(
          `Redis unavailable; falling back to in-memory rooms. ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return false;
      }
    }
    try {
      const pong = await this.client.ping();
      this.available = pong === 'PONG';
      if (this.available) this.logger.log('Redis connected.');
      return this.available;
    } catch {
      this.available = false;
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
      this.client = null;
    }
  }

  get isAvailable(): boolean {
    return this.client?.status === 'ready';
  }

  get raw(): Redis | null {
    return this.client;
  }

  duplicate(): Redis | null {
    if (!this.client) return null;
    return this.client.duplicate();
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
