import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

// Un compte banni ne doit obtenir aucun token, quel que soit le chemin de connexion.
function build(banned: boolean) {
  const user = {
    id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: true,
    passwordHash: bcrypt.hashSync('Secret123!', 4),
  };
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue({}) },
    account: { findUnique: jest.fn().mockResolvedValue({ user }) },
    moderationAction: {
      findFirst: jest.fn().mockResolvedValue(banned ? { action: 'BAN' } : null),
    },
  };
  const redis = {
    saveRefreshToken: jest.fn().mockResolvedValue(undefined),
    revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('tok') };
  const config = {
    get: jest.fn((_key: string, def?: string) => def),
    getOrThrow: jest.fn().mockReturnValue('secret-32-chars-long-xxxxxxxxxxxxxx'),
  };
  const service = new AuthService(
    prisma as never, redis as never, jwt as never, config as never,
    { send: jest.fn() } as never, { emit: jest.fn() } as never,
  );
  return { service, prisma, redis };
}

describe('AuthService — comptes bannis', () => {
  it('refuse la connexion par mot de passe avec AUTH_ACCOUNT_BANNED (403)', async () => {
    const { service } = build(true);
    await expect(service.login({ email: 'a@b.sn', password: 'Secret123!' } as never))
      .rejects.toMatchObject({ status: 403, code: 'AUTH_ACCOUNT_BANNED' });
  });

  it('accepte la connexion d\'un compte non banni', async () => {
    const { service } = build(false);
    const tokens = await service.login({ email: 'a@b.sn', password: 'Secret123!' } as never);
    expect(tokens).toBeDefined();
  });

  it('ne révèle le ban qu\'après un mot de passe correct', async () => {
    const { service } = build(true);
    await expect(service.login({ email: 'a@b.sn', password: 'mauvais' } as never))
      .rejects.toMatchObject({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' });
  });

  it('refuse le refresh et révoque le token rotaté', async () => {
    const { service, redis } = build(true);
    await expect(service.refresh('u1', 'jti-1'))
      .rejects.toMatchObject({ status: 403, code: 'AUTH_ACCOUNT_BANNED' });
    expect(redis.revokeRefreshToken).toHaveBeenCalledWith('u1', 'jti-1');
  });

  it('refuse la connexion OAuth d\'un compte déjà lié et banni', async () => {
    const { service } = build(true);
    await expect(service.resolveOAuthLogin({
      provider: 'github', providerAccountId: '42', email: 'a@b.sn',
    } as never)).rejects.toMatchObject({ status: 403, code: 'AUTH_ACCOUNT_BANNED' });
  });
});
