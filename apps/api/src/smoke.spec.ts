import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { MailService } from './mail/mail.service';
import { HealthModule } from './health/health.module';
import { configValidationSchema } from './config/config.schema';

jest.setTimeout(30000);

describe('Smoke — E1 stack complète', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env.local', '.env'],
          cache: true,
          validationSchema: configValidationSchema,
        }),
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        PrismaModule,
        RedisModule,
        MailModule,
        HealthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns HTTP 200 with ok status when Postgres and Redis are up', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toMatchObject({ status: 'ok', db: 'ok', redis: 'ok' });
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('ConfigModule', () => {
    it('injects DATABASE_URL', () => {
      const config = moduleRef.get(ConfigService);
      expect(config.get<string>('DATABASE_URL')).toBeDefined();
    });

    it('injects REDIS_URL', () => {
      const config = moduleRef.get(ConfigService);
      expect(config.get<string>('REDIS_URL')).toBeDefined();
    });
  });

  describe('MailService', () => {
    it('is injectable', () => {
      expect(moduleRef.get(MailService)).toBeDefined();
    });

    it('operates in sandbox mode (no network call)', async () => {
      const mailService = moduleRef.get(MailService);
      await expect(
        mailService.send('test@example.com', 'Smoke Test', '<p>ok</p>'),
      ).resolves.toBeUndefined();
    });
  });

  describe('LoggerModule', () => {
    it('is wired — module context initialized successfully', () => {
      expect(app).toBeDefined();
    });
  });
});
