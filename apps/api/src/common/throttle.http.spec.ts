import { Body, Controller, HttpCode, INestApplication, Post } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { Throttle, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { EMAIL_THROTTLER, throttlers, trustProxy } from './throttle';

@Controller()
class LoginController {
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 }, [EMAIL_THROTTLER]: { limit: 5, ttl: 60000 } })
  login(@Body() body: unknown) {
    return body;
  }
}

describe('Limites de connexion (HTTP)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(throttlers({}))],
      controllers: [LoginController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    const express = moduleRef.createNestApplication<NestExpressApplication>();
    express.set('trust proxy', trustProxy({}));
    app = express;
    await app.init();
  });

  afterEach(() => app.close());

  const login = (ip: string, email: string) =>
    request(app.getHttpServer()).post('/login').set('X-Forwarded-For', ip).send({ email, password: 'x' });

  it('bloque le 6e essai sur une même adresse, même depuis des IP différentes', async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await login(`10.0.0.${i}`, 'Cible@Example.com')).status).toBe(200);
    }
    expect((await login('10.0.0.99', 'cible@example.com')).status).toBe(429);
  });

  it('compte chaque visiteur à part : un visiteur bloqué ne bloque pas les autres', async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await login('10.0.0.1', `user${i}@example.com`)).status).toBe(200);
    }
    expect((await login('10.0.0.1', 'user6@example.com')).status).toBe(429);
    expect((await login('10.0.0.2', 'user7@example.com')).status).toBe(200);
  });
});
