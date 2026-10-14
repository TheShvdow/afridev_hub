import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface HealthResult {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  redis: 'ok' | 'error';
  uptime: number;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async checkHealth(): Promise<HealthResult> {
    const [dbResult, redisResult] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);

    const db: 'ok' | 'error' = dbResult.status === 'fulfilled' ? 'ok' : 'error';
    const redis: 'ok' | 'error' = redisResult.status === 'fulfilled' ? 'ok' : 'error';
    const status: 'ok' | 'error' = db === 'ok' && redis === 'ok' ? 'ok' : 'error';

    return { status, db, redis, uptime: process.uptime() };
  }
}
