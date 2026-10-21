import { AuthService, generateVerificationCode, hashCode } from './auth.service';

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
      findFirst: jest.fn().mockResolvedValue(opts.token ?? null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
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

// bcrypt à 12 tours est lent : sous charge (suite complète en parallèle) le délai de 5 s est dépassé.
jest.setTimeout(20000);

const CODE = 'K7Q2MZ';
const record = (overrides = {}) => ({ identifier: 'u1', token: hashCode(CODE), expires: new Date(Date.now() + 60_000), attempts: 0, ...overrides });

describe('generateVerificationCode', () => {
  it('returns 6 unambiguous uppercase letters or digits', () => {
    for (let i = 0; i < 200; i++) expect(generateVerificationCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe('AuthService — vérification email par code', () => {
  it('stores only the hash of a 6-character code on register and emails the code', async () => {
    const { service, prisma, mail } = build();
    const tokens = await service.register(dto as never);
    expect(tokens).toEqual({ accessToken: 'tok', refreshToken: 'tok' });
    const stored = prisma.verificationToken.create.mock.calls[0][0].data;
    expect(stored).toMatchObject({ identifier: 'u1', expires: expect.any(Date) });
    expect(stored.token).toMatch(/^[0-9a-f]{64}$/);
    const [to, subject, html] = mail.send.mock.calls[0];
    const code = /^([A-Z0-9]{6}) /.exec(subject)?.[1] as string;
    expect(to).toBe('a@b.sn');
    expect(html).toContain(code);
    expect(stored.token).toBe(hashCode(code));
  });

  it('still registers when the email cannot be sent', async () => {
    const { service } = build({ mailFails: true });
    await expect(service.register(dto as never)).resolves.toBeDefined();
  });

  it('marks the user verified and consumes the code when it matches', async () => {
    const { service, prisma } = build({ token: record() });
    await expect(service.verifyEmail('u1', CODE)).resolves.toEqual({ message: 'Email vérifié.' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { isVerified: true } });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('accepts the code whatever its case', async () => {
    const { service } = build({ token: record() });
    await expect(service.verifyEmail('u1', 'k7q2mz')).resolves.toEqual({ message: 'Email vérifié.' });
  });

  it('emits auth.email.verified so the verified badge is re-evaluated', async () => {
    const { service, events } = build({ token: record() });
    await service.verifyEmail('u1', CODE);
    expect(events.emit).toHaveBeenCalledWith('auth.email.verified', { userId: 'u1' });
  });

  it('counts a wrong code as a failed attempt', async () => {
    const { service, prisma } = build({ token: record({ attempts: 1 }) });
    await expect(service.verifyEmail('u1', 'AAAAAA')).rejects.toMatchObject({ code: 'AUTH_VERIFICATION_TOKEN_INVALID' });
    expect(prisma.verificationToken.update).toHaveBeenCalledWith(expect.objectContaining({ data: { attempts: 2 } }));
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('invalidates the code at the 5th wrong attempt', async () => {
    const { service, prisma } = build({ token: record({ attempts: 4 }) });
    await expect(service.verifyEmail('u1', 'AAAAAA')).rejects.toMatchObject({ code: 'AUTH_VERIFICATION_TOO_MANY_ATTEMPTS', status: 429 });
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'u1' } });
  });

  it('rejects when no code is pending', async () => {
    const { service } = build({ token: null });
    await expect(service.verifyEmail('u1', CODE)).rejects.toMatchObject({ code: 'AUTH_VERIFICATION_TOKEN_INVALID' });
  });

  it('rejects an expired code', async () => {
    const { service, prisma } = build({ token: record({ expires: new Date(Date.now() - 1000) }) });
    await expect(service.verifyEmail('u1', CODE)).rejects.toMatchObject({ code: 'AUTH_VERIFICATION_TOKEN_INVALID' });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('refuses a code for an account already verified', async () => {
    const { service } = build({ user: { id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: true }, token: record() });
    await expect(service.verifyEmail('u1', CODE)).rejects.toMatchObject({ code: 'AUTH_ALREADY_VERIFIED' });
  });

  it('refuses to resend for an already verified account', async () => {
    const { service, mail } = build({ user: { id: 'u1', email: 'a@b.sn', username: 'amadou', role: 'MEMBER', isVerified: true } });
    await expect(service.resendVerification('u1')).rejects.toMatchObject({ code: 'AUTH_ALREADY_VERIFIED' });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('resends a fresh code for an unverified account', async () => {
    const { service, prisma, mail } = build();
    await service.resendVerification('u1');
    expect(prisma.verificationToken.deleteMany).toHaveBeenCalledWith({ where: { identifier: 'u1' } });
    expect(mail.send).toHaveBeenCalled();
  });
});
