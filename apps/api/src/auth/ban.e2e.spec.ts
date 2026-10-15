import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

// Un ban doit couper l'accès réel : connexion refusée, et token déjà émis refusé sur les routes protégées.
// Même garde que auth.e2e : ne tourne que sur une base de TEST explicite.
const TEST_DB = process.env['TEST_DATABASE_URL'];
const TEST_REDIS = process.env['TEST_REDIS_URL'];
const runE2E = TEST_DB && TEST_REDIS ? describe : describe.skip;

runE2E('Bannissement — effet réel sur l\'API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const stamp = Date.now().toString(36);
  const username = `ban_${stamp}`;
  const email = `${username}@test.invalid`;
  const modUsername = `${username}_mod`;
  const password = 'Secret123!';
  let userId: string;
  let moderatorId: string;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = TEST_DB;
    process.env['DIRECT_URL'] = TEST_DB;
    process.env['REDIS_URL'] = TEST_REDIS;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 4);
    const user = await prisma.user.create({ data: { username, email, passwordHash, isVerified: true } });
    const mod = await prisma.user.create({
      data: { username: modUsername, email: `${modUsername}@test.invalid`, passwordHash, isVerified: true, role: 'MODERATOR' },
    });
    userId = user.id;
    moderatorId = mod.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { userId: { in: [userId, moderatorId] } } });
    await prisma.moderationAction.deleteMany({ where: { entityId: userId } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, moderatorId] } } });
    await app.close();
  });

  it('un compte non banni peut se connecter et appeler une route protégée', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login').send({ email, password }).expect(200);
    await request(app.getHttpServer())
      .get('/api/auth/me').set('Authorization', `Bearer ${login.body.data.accessToken}`).expect(200);
  });

  it('après un ban, la connexion est refusée et le token déjà émis aussi', async () => {
    const before = await request(app.getHttpServer())
      .post('/api/auth/login').send({ email, password }).expect(200);
    const token = before.body.data.accessToken as string;

    await prisma.moderationAction.create({
      data: { moderatorId, entityType: 'USER', entityId: userId, action: 'BAN', note: 'test' },
    });

    await request(app.getHttpServer())
      .post('/api/auth/login').send({ email, password })
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('AUTH_ACCOUNT_BANNED'));

    await request(app.getHttpServer())
      .get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      .expect(403)
      .expect((res) => expect(res.body.error.code).toBe('AUTH_ACCOUNT_BANNED'));
  });

  it('une levée de ban rétablit la connexion', async () => {
    await prisma.moderationAction.create({
      data: { moderatorId, entityType: 'USER', entityId: userId, action: 'RESTORED', note: 'levée' },
    });
    await request(app.getHttpServer())
      .post('/api/auth/login').send({ email, password }).expect(200);
  });
});
