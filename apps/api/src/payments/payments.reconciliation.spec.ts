import { PaymentsService } from './payments.service';

const NOW = new Date('2026-10-15T12:00:00Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

function build(pending: Array<Record<string, unknown>>, statuses: Record<string, string | Error>) {
  const prisma = {
    payment: {
      findMany: jest.fn().mockResolvedValue(pending),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    commission: { create: jest.fn() },
  };
  const bictorys = {
    getStatus: jest.fn().mockImplementation((ref: string) => {
      const value = statuses[ref];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    }),
  };
  const config = { get: jest.fn((_k: string, d?: unknown) => d) };
  const service = new PaymentsService(prisma as never, config as never, bictorys as never);
  return { service, prisma, bictorys };
}

const payment = (id: string, ref: string, minutes: number) => ({
  id, userId: 'u1', amount: 100, currency: 'XOF', entityType: 'RECRUITER_PLAN', entityId: 'plan',
  externalRef: ref, status: 'PENDING', createdAt: minutesAgo(minutes), metadata: {},
});

describe('PaymentsService.reconcilePendingPayments', () => {
  it('settles a payment Bictorys reports as succeeded and leaves pending ones untouched', async () => {
    const { service, prisma } = build(
      [payment('p1', 'tx1', 30), payment('p2', 'tx2', 30)],
      { tx1: 'succeeded', tx2: 'pending' },
    );
    const result = await service.reconcilePendingPayments(NOW);
    expect(result).toEqual({ checked: 2, settled: 1 });
    expect(prisma.payment.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'CAPTURED' }),
    }));
  });

  it('settles a payment reported as failed or expired', async () => {
    const { service, prisma } = build([payment('p1', 'tx1', 240)], { tx1: 'expired' });
    await service.reconcilePendingPayments(NOW);
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }));
  });

  it('keeps going when one status call fails', async () => {
    const { service, prisma } = build(
      [payment('p1', 'tx1', 30), payment('p2', 'tx2', 30)],
      { tx1: new Error('timeout'), tx2: 'succeeded' },
    );
    const result = await service.reconcilePendingPayments(NOW);
    expect(result).toEqual({ checked: 2, settled: 1 });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p2', status: 'PENDING' } }));
  });

  it('only looks at payments between 5 minutes and 24 hours old', async () => {
    const { service, prisma } = build([], {});
    await service.reconcilePendingPayments(NOW);
    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: 'PENDING',
        createdAt: { lt: minutesAgo(5), gt: minutesAgo(24 * 60) },
      }),
    }));
  });
});
