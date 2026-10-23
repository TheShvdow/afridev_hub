import { JwtStrategy } from './jwt.strategy';

function build(banned: boolean, found = true, isVerified = true) {
  const user = found ? { id: 'u1', email: 'a@b.sn', role: 'MEMBER', username: 'amadou', isVerified } : null;
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user) },
    moderationAction: { findFirst: jest.fn().mockResolvedValue(banned ? { action: 'BAN' } : null) },
  };
  const config = { getOrThrow: jest.fn().mockReturnValue('secret-32-chars-long-xxxxxxxxxxxxxx') };
  return new JwtStrategy(config as never, prisma as never);
}

describe('JwtStrategy — ban appliqué à chaque requête', () => {
  it('renvoie l\'utilisateur quand il n\'est pas banni', async () => {
    const strategy = build(false);
    await expect(strategy.validate({ sub: 'u1', email: 'a@b.sn', role: 'MEMBER' }))
      .resolves.toMatchObject({ id: 'u1' });
  });

  it('refuse un access token valide appartenant à un compte banni', async () => {
    const strategy = build(true);
    await expect(strategy.validate({ sub: 'u1', email: 'a@b.sn', role: 'MEMBER' }))
      .rejects.toMatchObject({ status: 403, code: 'AUTH_ACCOUNT_BANNED' });
  });

  it('garde le refus AUTH_TOKEN_INVALID pour un utilisateur supprimé', async () => {
    const strategy = build(false, false);
    await expect(strategy.validate({ sub: 'gone', email: 'x', role: 'MEMBER' }))
      .rejects.toMatchObject({ status: 401, code: 'AUTH_TOKEN_INVALID' });
  });

  it('refuse un access token appartenant à un compte dont l\'email n\'est pas vérifié', async () => {
    const strategy = build(false, true, false);
    await expect(strategy.validate({ sub: 'u1', email: 'a@b.sn', role: 'MEMBER' }))
      .rejects.toMatchObject({ status: 403, code: 'AUTH_EMAIL_NOT_VERIFIED' });
  });
});
