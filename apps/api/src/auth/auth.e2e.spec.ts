import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

// Smoke test E2 (story E2-11). Ne tourne que sur une base de TEST explicite :
// jamais sur la base de développement partagée. Lancer avec :
//   TEST_DATABASE_URL=… TEST_REDIS_URL=… npx nx test api --testPathPattern=auth.e2e
const TEST_DB = process.env['TEST_DATABASE_URL'];
const TEST_REDIS = process.env['TEST_REDIS_URL'];
const runE2E = TEST_DB && TEST_REDIS ? describe : describe.skip;

runE2E('Auth + profil — parcours complet (E2)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const username = `e2e_${Date.now().toString(36)}`;
  const email = `${username}@test.invalid`;
  const password = 'Secret123!';
  // Le code n'est stocké qu'en empreinte : on le lit dans l'email envoyé.
  const sentMails: { to: string; subject: string; html: string }[] = [];

  beforeAll(async () => {
    process.env['DATABASE_URL'] = TEST_DB;
    process.env['DIRECT_URL'] = TEST_DB;
    process.env['REDIS_URL'] = TEST_REDIS;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(MailService)
      .useValue({ send: async (to: string, subject: string, html: string) => { sentMails.push({ to, subject, html }); } })
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { username } });
    await app.close();
  });

  it('registers, verifies the email, logs in and reads the profile', async () => {
    const registered = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ username, email, password }).expect(201);
    expect(registered.body.data).toEqual({ message: expect.any(String), email });

    // Pas de connexion avant la vérification de l'email.
    await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email, password }).expect(403);

    const mail = sentMails.find((sent) => sent.to === email);
    const code = /^([A-Z0-9]{6}) /.exec(mail?.subject ?? '')?.[1];
    expect(code).toBeDefined();
    await request(app.getHttpServer()).post('/api/auth/verify-email')
      .send({ email, code }).expect(200);

    const login = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email, password }).expect(200);
    const token = login.body.data.accessToken as string;

    const me = await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.data).toMatchObject({ username, isVerified: true, reputation: 0 });
  });

  it('completes the profile, exposes Open Graph metadata and awards the verified badge', async () => {
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password });
    const token = login.body.data.accessToken as string;

    await request(app.getHttpServer()).patch('/api/users/me/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ country: 'SN', stack: ['TypeScript'] }).expect(200);

    await request(app.getHttpServer()).patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: 'Développeur fullstack à Dakar, je construis des APIs et des interfaces pour la communauté.', githubUsername: username })
      .expect(200);

    const profile = await request(app.getHttpServer()).get(`/api/users/${username}`).expect(200);
    expect(profile.body.data.ogMeta.ogTitle).toContain('AfriDev Hub');

    // Le listener est asynchrone : on attend brièvement l'attribution du badge.
    const user = await prisma.user.findUniqueOrThrow({ where: { username } });
    let awarded = false;
    for (let i = 0; i < 20 && !awarded; i++) {
      awarded = !!(await prisma.userBadge.findFirst({
        where: { userId: user.id, badge: { slug: 'dev-verifie' } },
      }));
      if (!awarded) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(awarded).toBe(true);
  });
});
