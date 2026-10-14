import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    @InjectPinoLogger(PrismaService.name)
    private readonly logger: PinoLogger,
  ) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
      errorFormat: 'minimal',
    });

    // Log des queries lentes en dev (> 500ms)
    if (process.env['NODE_ENV'] === 'development') {
      (this as any).$on('query', (e: any) => {
        if (e.duration > 500) {
          this.logger.warn({ duration: e.duration, query: e.query }, 'Slow query detected');
        }
      });
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.info('Database connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.info('Database disconnected');
  }

  /** Utilitaire : exclure des champs d'un résultat Prisma */
  exclude<T, Key extends keyof T>(entity: T, keys: Key[]): Omit<T, Key> {
    for (const key of keys) {
      delete entity[key];
    }
    return entity;
  }
}
