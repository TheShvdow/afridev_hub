import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { CountriesModule } from './countries/countries.module';
import { MailModule } from './mail/mail.module';
import { UploadModule } from './upload/upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { serializeRequest, serializeResponse } from './common/logging/request-serializer';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      validationSchema: configValidationSchema,
    }),

    // ── Événements de domaine (AD-1 / AD-8) ───────────────────────
    EventEmitterModule.forRoot(),

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
        serializers: { req: serializeRequest, res: serializeResponse },
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
    CountriesModule,

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
    UploadModule,
    ScheduleModule.forRoot(),
  ],
  providers: [
    // Enveloppe AD-7 : succès { data }, erreur { error: { code, message } }
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    // Limite globale par IP ; les routes sensibles ajoutent leur propre @Throttle
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
