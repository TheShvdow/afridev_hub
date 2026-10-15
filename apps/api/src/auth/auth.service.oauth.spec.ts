import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

const hash = bcrypt.hashSync('Secret123!', 4);

function build(opts: {
  account?: Record<string, unknown> | null;
  userByEmail?: Record<string, unknown> | null;
  linkClaims?: Record<string, unknown> | null;
  linkTaken?: boolean;
  userById?: Record<string, unknown> | null;
} = {}) {
  const prisma = {
    account: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.provider_providerAccountId) {
          return Promise.resolve(opts.linkTaken ? { id: 'x' } : (opts.account ?? null));
        }
        return Promise.resolve(null);
      }),
      create: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        if (where.email) return Promise.resolve(opts.userByEmail ?? null);
        if (where.id) return Promise.resolve(opts.userById ?? null);
        return Promise.resolve(null); // username libre
      }),
      create: jest.fn().mockResolvedValue({ id: 'new', email: 'g@x.sn', username: 'g', role: 'MEMBER' }),
      update: jest.fn().mockResolvedValue({}),
    },
    moderationAction: { findFirst: jest.fn().mockResolvedValue(null) }, // aucun ban
  };
  const jwt = {
    signAsync: jest.fn().mockImplementation((payload: unknown) =>
      Promise.resolve(payload && typeof payload === 'object' && 'typ' in payload ? 'link-token' : 'tok')),
    verifyAsync: jest.fn().mockImplementation(() => {
      if (opts.linkClaims === null) throw new Error('bad token');
      return Promise.resolve(opts.linkClaims ?? { typ: 'oauth-link', provider: 'google', providerAccountId: 'g-1', userId: 'u1' });
    }),
  };
  const redis = { saveRefreshToken: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn((_k: string, d?: string) => d), getOrThrow: jest.fn().mockReturnValue('s'.repeat(40)) };
  const mail = { send: jest.fn() };
  const events = { emit: jest.fn() };
  const service = new AuthService(prisma as never, redis as never, jwt as never, config as never, mail as never, events as never);
  return { service, prisma, jwt };
}

const google = {
  provider: 'google' as const, providerAccountId: 'g-1', email: 'g@x.sn', emailVerified: true,
  username: 'g', displayName: 'G', avatarUrl: null,
};

// bcrypt à 12 tours est lent : sous charge (suite complète en parallèle) le délai de 5 s est dépassé.
jest.setTimeout(20000);

describe('AuthService — connexion OAuth', () => {
  it('logs in directly when the provider account is already linked', async () => {
    const { service, prisma } = build({ account: { user: { id: 'u1', email: 'g@x.sn', username: 'g', role: 'MEMBER' } } });
    const result = await service.resolveOAuthLogin(google);
    expect(result.type).toBe('tokens');
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('never links automatically to an existing account with the same email: it asks for confirmation', async () => {
    const { service, prisma } = build({ userByEmail: { id: 'u1', email: 'g@x.sn', passwordHash: hash } });
    const result = await service.resolveOAuthLogin(google);
    expect(result).toEqual({ type: 'link', linkToken: 'link-token', email: 'g@x.sn' });
    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  it('creates a new user and its provider account when the email is unknown', async () => {
    const { service, prisma } = build();
    const result = await service.resolveOAuthLogin(google);
    expect(result.type).toBe('tokens');
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'g@x.sn', isVerified: true, accounts: { create: { provider: 'google', providerAccountId: 'g-1' } } }),
    }));
  });
});

describe('AuthService.linkOAuthAccount — liaison confirmée', () => {
  it('links the provider account when the password of the existing account is correct', async () => {
    const { service, prisma } = build({ userById: { id: 'u1', email: 'g@x.sn', username: 'g', role: 'MEMBER', passwordHash: hash } });
    await service.linkOAuthAccount('link-token', 'Secret123!');
    expect(prisma.account.create).toHaveBeenCalledWith({
      data: { userId: 'u1', provider: 'google', providerAccountId: 'g-1' },
    });
  });

  it('refuses a wrong password without linking anything', async () => {
    const { service, prisma } = build({ userById: { id: 'u1', email: 'g@x.sn', passwordHash: hash } });
    await expect(service.linkOAuthAccount('link-token', 'mauvais')).rejects.toMatchObject({ code: 'AUTH_INVALID_CREDENTIALS' });
    expect(prisma.account.create).not.toHaveBeenCalled();
  });

  it('refuses an invalid or expired link token', async () => {
    const { service } = build({ linkClaims: null });
    await expect(service.linkOAuthAccount('forged', 'Secret123!')).rejects.toMatchObject({ code: 'AUTH_LINK_TOKEN_INVALID' });
  });

  it('refuses a token that is not a link token', async () => {
    const { service } = build({ linkClaims: { typ: 'access', userId: 'u1' } });
    await expect(service.linkOAuthAccount('x', 'Secret123!')).rejects.toMatchObject({ code: 'AUTH_LINK_TOKEN_INVALID' });
  });

  it('refuses to link a provider account already attached to someone', async () => {
    const { service } = build({ linkTaken: true, userById: { id: 'u1', email: 'g@x.sn', passwordHash: hash } });
    await expect(service.linkOAuthAccount('link-token', 'Secret123!')).rejects.toMatchObject({ code: 'AUTH_ACCOUNT_ALREADY_LINKED' });
  });
});
