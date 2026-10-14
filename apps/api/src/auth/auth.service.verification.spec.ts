import { AuthService } from './auth.service';

function build(opts: { user?: Record<string, unknown> | null; token?: Record<string, unknown> | null; mailFails?: boolean } = {}) {
  const user = opts.user === undefined
    ? { id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: false }
    : opts.user;
  const prisma = {
    user: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(user),
      findUnique: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({}),
    },
    verificationToken: {
      findUnique: jest.fn().mockResolvedValue(opts.token ?? null),
      create: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const redis = { saveRefreshToken: jest.fn().mockResolvedValue(undefined) };
  const jwt = { signAsync: jest.fn().mockResolvedValue('tok') };
  const config = {
    get: jest.fn((key: string, def?: string) => (key === 'WEB_URL' ? 'https://web.test' : def)),
    getOrThrow: jest.fn().mockReturnValue('secret-32-chars-long-xxxxxxxxxxxxxx'),
  };
  const mail = {
    send: opts.mailFails
      ? jest.fn().mockRejectedValue(new Error('resend down'))
      : jest.fn().mockResolvedValue(undefined),
  };
  const events = { emit: jest.fn() };
  const service = new AuthService(prisma as never, redis as never, jwt as never, config as never, mail as never, events as never);
  return { service, prisma, mail, events };
}

const dto = { username: 'amadou', email: 'a@b.sn', password: 'Secret123!' };

describe('AuthService — vérification email', () => {
  it('creates a verification token on register and sends the link by email', async () => {
    const { service, prisma, mail } = build();
    const tokens = await service.register(dto as never);
    expect(tokens).toEqual({ accessToken: 'tok', refreshToken: 'tok' });
    expect(prisma.verificationToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ identifier: 'u1', token: expect.any(String), expires: expect.any(Date) }),
    });
    expect(mail.send).toHaveBeenCalledWith('a@b.sn', expect.any(String), expect.stringContaining('https://web.test/auth/verify-email?token='));
  });

  it('still registers when the email cannot be sent', async () => {
    const { service } = build({ mailFails: true });
    await expect(service.register(dto as never)).resolves.toBeDefined();
  });

  it('marks the user verified and consumes the token on a valid link', async () => {
    const { service, prisma } = build({ token: { identifier: 'u1', token: 't', expires: new Date(Date.now() + 60_000) } });
    await expect(service.verifyEmail('t')).resolves.toEqual({ message: 'Email vérifié.' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isVerified: true } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('emits auth.email.verified so the verified badge is re-evaluated', async () => {
    const { service, events } = build({ token: { identifier: 'u1', token: 't', expires: new Date(Date.now() + 60_000) } });
    await service.verifyEmail('t');
    expect(events.emit).toHaveBeenCalledWith('auth.email.verified', { userId: 'u1' });
  });

  it('rejects an unknown token', async () => {
    const { service } = build({ token: null });
    await expect(service.verifyEmail('nope')).rejects.toMatchObject({ code: 'AUTH_VERIFICATION_TOKEN_INVALID' });
  });

  it('rejects an expired token', async () => {
    const { service, prisma } = build({ token: { identifier: 'u1', token: 't', expires: new Date(Date.now() - 1000) } });
    await expect(service.verifyEmail('t')).rejects.toMatchObject({ code: 'AUTH_VERIFICATION_TOKEN_INVALID' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses to resend for an already verified account', async () => {
    const { service, mail } = build({ user: { id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: true } });
    await expect(service.resendVerification('u1')).rejects.toMatchObject({ code: 'AUTH_ALREADY_VERIFIED' });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('resends a fresh link for an unverified account', async () => {
    const { service, prisma, mail } = build();
    await service.resendVerification('u1');
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'u1' } });
    expect(mail.send).toHaveBeenCalled();
  });
});
