import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import helmet from 'helmet';
import type { Request, Response } from 'express';
import * as compression from 'compression';
import { corsOrigins } from './common/cors';
import { applyEnvelopeToDocument } from './common/swagger/envelope.document';
import { SWAGGER_OAUTH_SCRIPT, SWAGGER_OAUTH_SCRIPT_PATH } from './common/swagger/oauth-login.script';

async function bootstrap() {
  // rawBody : la vérification HMAC des webhooks Bictorys exige le corps brut
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));

  // ── Sécurité ─────────────────────────────────────────────────────
  app.use(helmet());
  app.use(compression());

  // CORS — autoriser le front Angular (WEB_URL et CORS_ORIGINS)
  app.enableCors({
    origin: corsOrigins(process.env),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Versioning API ───────────────────────────────────────────────
  app.enableVersioning({ type: VersioningType.URI });

  // ── Préfixe global ────────────────────────────────────────────────
  app.setGlobalPrefix('api', { exclude: ['health'] });

  // ── Validation globale ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,       // Supprimer champs non décorés
      forbidNonWhitelisted: true,
      transform: true,       // Auto-transformer les types primitifs
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // ── Swagger (désactivé en production sauf SWAGGER_ENABLED=true) ──
  const swaggerEnabled =
    process.env['NODE_ENV'] !== 'production' ||
    process.env['SWAGGER_ENABLED'] === 'true';
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('AfriDev Hub API')
      .setDescription(
        'API REST — Communauté des développeurs africains\n\n' +
        'Connexion : [GitHub](/api/auth/github?redirect=docs) · [Google](/api/auth/google?redirect=docs). ' +
        'Au retour, le token d\'accès est placé dans « Authorize ».',
      )
      .setVersion('1.0')
      .addBearerAuth()
      // Noms identiques aux @ApiTags des contrôleurs (sinon tags en double)
      .addTag('Auth', 'Authentification')
      .addTag('Users', 'Profils utilisateurs')
      .addTag('Forum', 'Forum Q&A')
      .addTag('Votes', 'Votes sur questions et réponses')
      .addTag('Projects', 'Vitrine projets')
      .addTag('Jobs', 'Job board')
      .addTag('Payments', 'Paiements')
      .addTag('Notifications', 'Notifications')
      .addTag('Moderation', 'Modération')
      .addTag('Gamification', 'Badges & Réputation')
      .addTag('Admin', 'Administration')
      .addTag('Health', 'Santé de l\'API')
      .addTag('Countries', 'Liste des pays')
      .addTag('Upload', 'Envoi de fichiers vers R2 (URL présignées)')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    applyEnvelopeToDocument(document);
    app.getHttpAdapter().getInstance().get(SWAGGER_OAUTH_SCRIPT_PATH, (_req: Request, res: Response) => {
      res.type('application/javascript').send(SWAGGER_OAUTH_SCRIPT);
    });
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
      customJs: SWAGGER_OAUTH_SCRIPT_PATH,
    });
  }

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log({ port }, '🚀 AfriDev Hub API ready');
  if (swaggerEnabled) {
    logger.log({ path: '/api/docs' }, '📚 Swagger docs');
  } else {
    logger.log('Swagger disabled (set SWAGGER_ENABLED=true to expose /api/docs)');
  }
}

bootstrap();
