import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Progressive login rate limiter using Redis sliding window counters.
 *
 * Thresholds (per email, 15-minute window):
 *  -  5 attempts → 429 with 30s Retry-After
 *  - 10 attempts → 429 with 5min Retry-After
 *  - 20 attempts → 429 with 30min Retry-After
 *
 * Graceful degradation: if Redis is unavailable, all logins are allowed.
 */
@Injectable()
export class LoginRateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(LoginRateLimiterService.name);
  private redis: Redis | null = null;

  private static readonly WINDOW_SECONDS = 900; // 15 minutes
  private static readonly THRESHOLDS = [
    { attempts: 20, retryAfter: 1800 }, // 30 min
    { attempts: 10, retryAfter: 300 }, // 5 min
    { attempts: 5, retryAfter: 30 }, // 30 sec
  ] as const;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);

    try {
      this.redis = new Redis({
        host,
        port,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 2 ? null : Math.min(times * 200, 1000)),
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis unavailable for rate limiting: ${err.message}`);
      });

      void this.redis.connect().catch(() => {
        this.logger.warn('Redis not reachable — login rate limiting disabled');
        this.redis = null;
      });
    } catch {
      this.logger.warn('Could not create Redis client — login rate limiting disabled');
    }
  }

  async onModuleDestroy() {
    await this.redis?.quit().catch(() => {});
  }

  /**
   * Check if an email is rate-limited. Returns { blocked: false } or
   * { blocked: true, retryAfter } with the number of seconds to wait.
   */
  async check(email: string): Promise<{ blocked: boolean; retryAfter?: number }> {
    if (!this.redis) return { blocked: false };

    try {
      const key = `login_rl:${email.toLowerCase()}`;
      const count = await this.redis.incr(key);

      // Set expiry only on first attempt in window
      if (count === 1) {
        await this.redis.expire(key, LoginRateLimiterService.WINDOW_SECONDS);
      }

      for (const threshold of LoginRateLimiterService.THRESHOLDS) {
        if (count >= threshold.attempts) {
          return { blocked: true, retryAfter: threshold.retryAfter };
        }
      }

      return { blocked: false };
    } catch {
      // Redis failure → allow login (graceful degradation)
      return { blocked: false };
    }
  }

  /** Reset counter after successful login. */
  async resetOnSuccess(email: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`login_rl:${email.toLowerCase()}`);
    } catch {
      // Non-critical — counter will expire naturally
    }
  }
}
