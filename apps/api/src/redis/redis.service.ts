import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(ENV) env: ApiEnv) {
    // Non-prod convenience: when no real Redis is available (e.g. local dev
    // without Docker), REDIS_INMEMORY=true swaps in an in-process ioredis-compatible
    // store so the API boots. Hard-gated off in production.
    if (process.env.REDIS_INMEMORY === 'true' && env.APP_ENV !== 'production') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- conditional, dev-only mock; a static import would bundle it unconditionally.
      const RedisMock = require('ioredis-mock');
      this.client = new RedisMock() as unknown as Redis;
    } else {
      this.client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false });
    }
  }

  /** Fixed-window rate limiter. Returns true if the action is allowed. */
  async allow(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, windowSeconds);
    return count <= limit;
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
