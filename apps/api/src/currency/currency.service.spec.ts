import { CurrencyService, RatesSnapshot } from './currency.service';

describe('CurrencyService', () => {
  const service = new CurrencyService({} as never, { emit: jest.fn() } as never);
  const rates: RatesSnapshot = {
    perUsd:    new Map([['USD', 1], ['XOF', 600], ['NGN', 1500]]),
    updatedAt: new Date('2026-10-21'),
  };

  it('converts between two currencies through the dollar', () => {
    expect(service.convert(400_000, 'NGN', 'XOF', rates)).toBe(160_000);
    expect(service.toUsd(600_000, 'XOF', rates)).toBe(1_000);
  });

  it('returns the amount unchanged for the same currency', () => {
    expect(service.convert(123, 'GHS', 'GHS', rates)).toBe(123);
  });

  it('returns null when a rate is unknown', () => {
    expect(service.convert(100, 'XOF', 'ZZZ', rates)).toBeNull();
  });

  it('keeps the previous rates when the source is down', async () => {
    const prisma = { $transaction: jest.fn(), exchangeRate: { upsert: jest.fn() } };
    const failing = new CurrencyService(prisma as never, { emit: jest.fn() } as never);
    const fetchSpy = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(failing.refreshRates()).resolves.toBe(0);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
