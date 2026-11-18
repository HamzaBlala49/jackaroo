import { Injectable } from '@nestjs/common';
import { AppError } from './app-error';

@Injectable()
export class RateLimiterService {
  private readonly hits = new Map<string, number[]>();

  reset(): void {
    this.hits.clear();
  }

  consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const timestamps = (this.hits.get(key) ?? []).filter((time) => now - time < windowMs);
    if (timestamps.length >= limit) {
      this.hits.set(key, timestamps);
      throw new AppError('RATE_LIMITED', 'Too many attempts. Please slow down.', 429);
    }
    timestamps.push(now);
    this.hits.set(key, timestamps);
    if (this.hits.size > 10_000) {
      for (const [entryKey, entryTimes] of this.hits) {
        if (entryTimes.every((time) => now - time > windowMs)) this.hits.delete(entryKey);
      }
    }
  }
}
