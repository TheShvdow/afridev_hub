import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';

// Vérifie en HTTP réel le throttling des routes sensibles et le plafond de pagination.
// Même garde que auth.e2e : ne tourne que sur une base de TEST explicite.
const TEST_DB = process.env['TEST_DATABASE_URL'];
const TEST_REDIS = process.env['TEST_REDIS_URL'];
const runE2E = TEST_DB && TEST_REDIS ? describe : describe.skip;

runE2E('Garde HTTP — throttling et pagination', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env['DATABASE_URL'] = TEST_DB;
    process.env['DIRECT_URL'] = TEST_DB;
    process.env['REDIS_URL'] = TEST_REDIS;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('bloque la 6e tentative de connexion dans la minute', async () => {
    const attempt = () => request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'inconnu@test.invalid', password: 'mauvais-mot-de-passe' });

    for (let i = 0; i < 5; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
  });

  it('refuse une taille de page supérieure au plafond', async () => {
    const res = await request(app.getHttpServer()).get('/api/jobs?limit=1000');
    expect(res.status).toBe(400);
  });

  it('refuse une page négative', async () => {
    const res = await request(app.getHttpServer()).get('/api/projects?page=-1');
    expect(res.status).toBe(400);
  });
});
