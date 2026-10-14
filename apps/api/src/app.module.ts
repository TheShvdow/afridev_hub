import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { configValidationSchema } from './config/config.schema';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ForumModule } from './forum/forum.module';
import { VotesModule } from './votes/votes.module';
import { ProjectsModule } from './projects/projects.module';
import { JobsModule } from './jobs/jobs.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ModerationModule } from './moderation/moderation.module';
import { GamificationModule } from './gamification/gamification.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      validationSchema: configValidationSchema,
    }),

    // ── Rate limiting ─────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl:   parseInt(process.env['THROTTLE_TTL']   ?? '60000'),
        limit: parseInt(process.env['THROTTLE_LIMIT'] ?? '60'),
      },
    ]),

    // ── Logging ───────────────────────────────────────────────────
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['NODE_ENV'] !== 'production' ? 'debug' : 'info',
        transport: process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { singleLine: true, colorize: true } }
          : undefined,
      },
    }),

    // ── Infrastructure ────────────────────────────────────────────
    PrismaModule,
    RedisModule,
    HealthModule,
    MailModule,

    // ── Domaines métier ───────────────────────────────────────────
    AuthModule,
    UsersModule,
    ForumModule,
    VotesModule,
    ProjectsModule,
    JobsModule,
    PaymentsModule,
    NotificationsModule,
    ModerationModule,
    GamificationModule,
    AdminModule,
  ],
})
export class AppModule {}
