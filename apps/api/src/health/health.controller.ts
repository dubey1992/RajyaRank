import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get('healthz')
  liveness() {
    return { status: 'ok' };
  }

  @Public()
  @Get('readyz')
  async readiness() {
    const [db, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.client.ping(),
    ]);
    const checks = {
      db: db.status === 'fulfilled' ? 'ok' : 'down',
      redis: redis.status === 'fulfilled' ? 'ok' : 'down',
    };
    const ok = Object.values(checks).every((v) => v === 'ok');
    return { status: ok ? 'ok' : 'degraded', checks };
  }
}
