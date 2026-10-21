import { PaymentsService } from './payments.service';

const NOW = new Date('2026-10-21T12:00:00Z');
const DAY = 86_400_000;

function build(opts: { isRecruiter?: boolean; plan?: Record<string, unknown> | null; updated?: number; price?: string } = {}) {
  const prisma = {
    user:          { findUnique: jest.fn().mockResolvedValue({ isRecruiter: opts.isRecruiter ?? true, email: 'rec@x.io' }) },
    payment:       {
      create:     jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'pay1', ...data })),
      update:     jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: opts.updated ?? 1 }),
    },
    commission:    { create: jest.fn() },
    recruiterPlan: { findUnique: jest.fn().mockResolvedValue(opts.plan ?? null), upsert: jest.fn().mockResolvedValue({}) },
    $transaction:  jest.fn(),
  };
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
  const provider = {
    name:      'BICTORYS',
    initiate:  jest.fn().mockResolvedValue({ transactionId: 'tx1', redirectUrl: 'https://pay' }),
    getStatus: jest.fn().mockResolvedValue('succeeded'),
  };
  const config = { get: jest.fn((key: string, fallback?: unknown) => (key === 'RECRUITER_PREMIUM_PRICE_XOF' ? opts.price : fallback)) };
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  const events = { emit: jest.fn() };
  const service = new PaymentsService(prisma as never, config as never, provider as never, mail as never, events as never);
  return { service, prisma, provider, mail, events };
}

const dto = { product: 'RECRUITER_PREMIUM_MONTHLY', paymentType: 'wave_money', country: 'SN' } as never;

describe('PaymentsService.initiatePayment — prix côté serveur', () => {
  it('charges the catalogue price, whatever the client sends', async () => {
    const { service, prisma, provider } = build();
    const result = await service.initiatePayment('rec', { ...(dto as object), amount: 100, entityId: 'someone-else' } as never);
    expect(prisma.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      amount: 25_000, currency: 'XOF', entityType: 'RECRUITER_PLAN', entityId: 'rec', provider: 'BICTORYS',
    }) });
    expect(provider.initiate).toHaveBeenCalledWith(expect.objectContaining({ amount: 25_000 }));
    expect(result).toMatchObject({ amount: 25_000, currency: 'XOF' });
  });

  it('uses the configured price when set', async () => {
    const { service, prisma } = build({ price: '30000' });
    await service.initiatePayment('rec', dto);
    expect(prisma.payment.create.mock.calls[0][0].data.amount).toBe(30_000);
  });

  it('requires a recruiter profile for the premium plan', async () => {
    const { service, prisma } = build({ isRecruiter: false });
    await expect(service.initiatePayment('u1', dto)).rejects.toMatchObject({ code: 'PAYMENTS_RECRUITER_REQUIRED', status: 403 });
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('lists the products with their server price', () => {
    const { service } = build();
    expect(service.listProducts()).toEqual([expect.objectContaining({ code: 'RECRUITER_PREMIUM_MONTHLY', amount: 25_000, durationDays: 30 })]);
  });
});

describe('PaymentsService — activation du plan premium (FR-34)', () => {
  const pending = (overrides = {}) => ({
    id: 'pay1', userId: 'rec', amount: 25_000, currency: 'XOF', entityType: 'RECRUITER_PLAN', entityId: 'rec',
    externalRef: 'tx1', status: 'PENDING', createdAt: new Date(NOW.getTime() - 30 * 60_000),
    metadata: { product: 'RECRUITER_PREMIUM_MONTHLY' }, ...overrides,
  });

  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('activates 30 days of premium, emails a receipt and emits the event', async () => {
    const { service, prisma, mail, events } = build();
    (prisma as unknown as { payment: { findMany: jest.Mock } }).payment.findMany = jest.fn().mockResolvedValue([pending()]);
    await service.reconcilePendingPayments(NOW);

    expect(prisma.recruiterPlan.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where:  { userId: 'rec' },
      create: expect.objectContaining({ planType: 'PREMIUM', isActive: true, expiresAt: new Date(NOW.getTime() + 30 * DAY) }),
    }));
    expect(mail.send).toHaveBeenCalledWith('rec@x.io', 'Votre reçu AfriDev Hub', expect.stringContaining('25'));
    expect(events.emit).toHaveBeenCalledWith('payments.payment.captured', expect.objectContaining({ paymentId: 'pay1', product: 'RECRUITER_PREMIUM_MONTHLY' }));
  });

  it('adds the 30 days to a premium period still running', async () => {
    const currentEnd = new Date(NOW.getTime() + 10 * DAY);
    const { service, prisma } = build({ plan: { planType: 'PREMIUM', isActive: true, expiresAt: currentEnd } });
    (prisma as unknown as { payment: { findMany: jest.Mock } }).payment.findMany = jest.fn().mockResolvedValue([pending()]);
    await service.reconcilePendingPayments(NOW);
    expect(prisma.recruiterPlan.upsert.mock.calls[0][0].update.expiresAt).toEqual(new Date(currentEnd.getTime() + 30 * DAY));
  });

  it('never activates twice when the payment was already settled', async () => {
    const { service, prisma, mail } = build({ updated: 0 });
    (prisma as unknown as { payment: { findMany: jest.Mock } }).payment.findMany = jest.fn().mockResolvedValue([pending()]);
    await service.reconcilePendingPayments(NOW);
    expect(prisma.recruiterPlan.upsert).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('keeps the payment captured when the receipt cannot be sent', async () => {
    const { service, prisma, mail } = build();
    mail.send.mockRejectedValue(new Error('Resend down'));
    (prisma as unknown as { payment: { findMany: jest.Mock } }).payment.findMany = jest.fn().mockResolvedValue([pending()]);
    await expect(service.reconcilePendingPayments(NOW)).resolves.toEqual({ checked: 1, settled: 1 });
    expect(prisma.recruiterPlan.upsert).toHaveBeenCalled();
  });
});
