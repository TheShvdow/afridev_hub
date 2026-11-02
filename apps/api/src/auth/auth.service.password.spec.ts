import * as bcrypt from 'bcryptjs';
import { AuthService, hashCode } from './auth.service';

// bcrypt à 12 tours est lent : sous charge (suite complète en parallèle) le délai de 5 s est dépassé.
jest.setTimeout(30000);

const CODE = 'K7Q2MZ';
const record = (overrides = {}) => ({ identifier: 'password-reset:u1', token: hashCode(CODE), expires: new Date(Date.now() + 60_000), attempts: 0, ...overrides });

function build(opts: { user?: Record<string, unknown> | null; token?: Record<string, unknown> | null; banned?: boolean; mailFails?: boolean } = {}) {
  const user = opts.user === undefined
    ? { id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: true, passwordHash: null }
    : opts.user;
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue({}) },
    verificationToken: {
      findFirst: jest.fn().mockResolvedValue(opts.token ?? null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    moderationAction: { findFirst: jest.fn().mockResolvedValue(opts.banned ? { action: 'BAN' } : null) },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const redis = { saveRefreshToken: jest.fn().mockResolvedValue(undefined), revokeAllRefreshTokens: jest.fn().mockResolvedValue(undefined) };
  const jwt = { signAsync: jest.fn().mockResolvedValue('tok') };
  const config = { get: jest.fn((_key: string, def?: string) => def), getOrThrow: jest.fn().mockReturnValue('secret-32-chars-long-xxxxxxxxxxxxxx') };
  const mail = { send: opts.mailFails ? jest.fn().mockRejectedValue(new Error('resend down')) : jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma as never, redis as never, jwt as never, config as never, mail as never, { emit: jest.fn() } as never);
  return { service, prisma, redis, mail };
}

describe('AuthService — mot de passe oublié', () => {
  it('emails a 6-character code, stores only its hash under a reset identifier', async () => {
    const { service, prisma, mail } = build();
    const result = await service.requestPasswordReset('a@b.sn');

    expect(result.message).toContain('Si un compte');
    const stored = prisma.verificationToken.create.mock.calls[0][0].data;
    expect(stored.identifier).toBe('password-reset:u1');
    expect(stored.token).toMatch(/^[0-9a-f]{64}$/);
    // 30 minutes, pas 24 heures.
    expect(stored.expires.getTime() - Date.now()).toBeLessThanOrEqual(30 * 60 * 1000);
    expect(mail.send).toHaveBeenCalledTimes(1);
    expect(mail.send.mock.calls[0][2]).toContain('30 minutes');
  });

  it('keeps the e-mail verification codes untouched: it only replaces its own previous code', async () => {
    const { service, prisma } = build();
    await service.requestPasswordReset('a@b.sn');
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'password-reset:u1' } });
  });

  it('gives the same answer for an unknown address, and sends nothing', async () => {
    const known = await build().service.requestPasswordReset('a@b.sn');
    const { service, mail, prisma } = build({ user: null });
    const unknown = await service.requestPasswordReset('inconnu@b.sn');

    expect(unknown).toEqual(known);
    expect(mail.send).not.toHaveBeenCalled();
    expect(prisma.verificationToken.create).not.toHaveBeenCalled();
  });

  it('sends nothing to an unverified account or a suspended one, with the same answer', async () => {
    const unverified = build({ user: { id: 'u1', email: 'a@b.sn', username: 'a', isVerified: false } });
    await expect(unverified.service.requestPasswordReset('a@b.sn')).resolves.toMatchObject({ message: expect.any(String) });
    expect(unverified.mail.send).not.toHaveBeenCalled();

    const banned = build({ banned: true });
    await expect(banned.service.requestPasswordReset('a@b.sn')).resolves.toMatchObject({ message: expect.any(String) });
    expect(banned.mail.send).not.toHaveBeenCalled();
  });
});

describe('AuthService — réinitialisation avec le code', () => {
  it('sets the new password hashed, removes the code and closes every session', async () => {
    const { service, prisma, redis } = build({ token: record() });
    const result = await service.resetPassword('a@b.sn', CODE, 'NouveauMdp1');

    expect(result.message).toContain('Mot de passe modifié');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const update = prisma.user.update.mock.calls[0][0];
    expect(update.where).toEqual({ id: 'u1' });
    expect(update.data.passwordHash).not.toBe('NouveauMdp1');
    expect(await bcrypt.compare('NouveauMdp1', update.data.passwordHash)).toBe(true);
    expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
  });

  it('refuses an unknown address exactly like a wrong code', async () => {
    const { service } = build({ user: null });
    await expect(service.resetPassword('inconnu@b.sn', CODE, 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_RESET_CODE_INVALID', status: 400 });
  });

  it('refuses when no code was requested, or when it has expired', async () => {
    await expect(build({ token: null }).service.resetPassword('a@b.sn', CODE, 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_RESET_CODE_INVALID' });
    const expired = build({ token: record({ expires: new Date(Date.now() - 1000) }) });
    await expect(expired.service.resetPassword('a@b.sn', CODE, 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_RESET_CODE_INVALID' });
    expect(expired.prisma.user.update).not.toHaveBeenCalled();
  });

  it('counts a wrong code and leaves the password alone', async () => {
    const { service, prisma, redis } = build({ token: record({ attempts: 1 }) });
    await expect(service.resetPassword('a@b.sn', 'WRONG2', 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_RESET_CODE_INVALID' });

    expect(prisma.verificationToken.update.mock.calls[0][0].data).toEqual({ attempts: 2 });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(redis.revokeAllRefreshTokens).not.toHaveBeenCalled();
  });

  it('cancels the code at the 5th wrong attempt', async () => {
    const { service, prisma } = build({ token: record({ attempts: 4 }) });
    await expect(service.resetPassword('a@b.sn', 'WRONG2', 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_RESET_TOO_MANY_ATTEMPTS', status: 429 });
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'password-reset:u1' } });
  });

  it('does not accept an e-mail verification code as a reset code', async () => {
    // Un code de vérification est rangé sous l'identifiant de l'utilisateur, pas sous « password-reset: ».
    const { service, prisma } = build({ token: null });
    await expect(service.resetPassword('a@b.sn', CODE, 'NouveauMdp1')).rejects.toBeDefined();
    expect(prisma.verificationToken.findFirst).toHaveBeenCalledWith({ where: { identifier: 'password-reset:u1' } });
  });
});

describe('AuthService — changement de mot de passe', () => {
  const withPassword = async (plain: string) => ({
    id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: true, passwordHash: await bcrypt.hash(plain, 4),
  });

  it('changes the password, closes the other sessions and keeps this device signed in', async () => {
    const { service, prisma, redis } = build({ user: await withPassword('AncienMdp1') });
    const tokens = await service.changePassword('u1', 'AncienMdp1', 'NouveauMdp1');

    expect(await bcrypt.compare('NouveauMdp1', prisma.user.update.mock.calls[0][0].data.passwordHash)).toBe(true);
    expect(redis.revokeAllRefreshTokens).toHaveBeenCalledWith('u1');
    // Les jetons de cet appareil sont rédigés après la révocation générale : ils restent valables.
    expect(tokens).toEqual({ accessToken: 'tok', refreshToken: 'tok' });
    expect(redis.saveRefreshToken).toHaveBeenCalled();
  });

  it('refuses a wrong current password with a 400, never a 401', async () => {
    const { service, prisma } = build({ user: await withPassword('AncienMdp1') });
    await expect(service.changePassword('u1', 'Mauvais1', 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_CURRENT_PASSWORD_INVALID', status: 400 });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses a new password identical to the current one', async () => {
    const { service } = build({ user: await withPassword('AncienMdp1') });
    await expect(service.changePassword('u1', 'AncienMdp1', 'AncienMdp1')).rejects.toMatchObject({ code: 'AUTH_PASSWORD_UNCHANGED', status: 400 });
  });

  it('tells a GitHub or Google account that it has no password to change', async () => {
    const { service } = build({ user: { id: 'u1', email: 'a@b.sn', username: 'a', passwordHash: null } });
    await expect(service.changePassword('u1', 'x', 'NouveauMdp1')).rejects.toMatchObject({ code: 'AUTH_NO_PASSWORD', status: 400 });
  });
});
