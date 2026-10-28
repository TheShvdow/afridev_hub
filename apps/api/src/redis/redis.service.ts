import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(
    @InjectPinoLogger(RedisService.name)
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.client = new Redis(
      this.config.getOrThrow<string>('REDIS_URL'),
      {
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      }
    );

    this.client.on('connect', () => this.logger.info('Redis connected'));
    this.client.on('error', (e) => this.logger.error({ err: e }, 'Redis error'));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  // ── Méthodes génériques ───────────────────────────────────────────

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(...keys: string[]): Promise<void> {
    await this.client.del(...keys);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  // ── Refresh tokens ────────────────────────────────────────────────

  private refreshKey(userId: string, jti: string) {
    return `refresh:${userId}:${jti}`;
  }

  async saveRefreshToken(userId: string, jti: string, ttlSeconds: number): Promise<void> {
    await this.set(this.refreshKey(userId, jti), '1', ttlSeconds);
  }

  async isRefreshTokenValid(userId: string, jti: string): Promise<boolean> {
    return this.exists(this.refreshKey(userId, jti));
  }

  async revokeRefreshToken(userId: string, jti: string): Promise<void> {
    await this.del(this.refreshKey(userId, jti));
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    const keys = await this.client.keys(`refresh:${userId}:*`);
    if (keys.length > 0) await this.del(...keys);
  }

  // ── Health probe ──────────────────────────────────────────────────

  async ping(): Promise<'PONG'> {
    return this.client.ping() as Promise<'PONG'>;
  }

  // ── Cache générique ───────────────────────────────────────────────

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const val = await this.get(key);
    return val ? (JSON.parse(val) as T) : null;
  }
}
