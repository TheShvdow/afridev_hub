import { JobAlertsService } from './job-alerts.service';
import { CurrencyService, RatesSnapshot } from '../currency/currency.service';

const rates: RatesSnapshot = { perUsd: new Map([['USD', 1], ['XOF', 600], ['NGN', 1500]]), updatedAt: new Date() };
const currency = new CurrencyService({} as never, { emit: jest.fn() } as never);
const offer = { country: 'SN', mode: 'REMOTE', stack: ['angular', 'nestjs'], salaryMax: 900000, currency: 'XOF' } as const;
const alert = { country: null, mode: null, stack: [] as string[], salaryMin: null, currency: null };

describe('JobAlertsService.matches (FR-32)', () => {
  const service = new JobAlertsService({} as never, currency, {} as never, {} as never, { emit: jest.fn() } as never);

  it('matches when every set criterion is met', () => {
    expect(service.matches({ ...alert, country: 'SN', stack: ['nestjs'] }, offer as never, rates)).toBe(true);
  });

  it('rejects another country or no common technology', () => {
    expect(service.matches({ ...alert, country: 'CI' }, offer as never, rates)).toBe(false);
    expect(service.matches({ ...alert, stack: ['django'] }, offer as never, rates)).toBe(false);
  });

  it('compares the minimum salary across currencies', () => {
    // 2 000 000 NGN ≈ 800 000 XOF ≤ 900 000 XOF
    expect(service.matches({ ...alert, salaryMin: 2_000_000, currency: 'NGN' }, offer as never, rates)).toBe(true);
    expect(service.matches({ ...alert, salaryMin: 3_000_000, currency: 'NGN' }, offer as never, rates)).toBe(false);
  });
});

describe('JobAlertsService — notifications', () => {
  it('notifies each matching member once when an offer is published', async () => {
    const prisma = {
      jobOffer: { findUnique: jest.fn().mockResolvedValue({ id: 'j1', title: 'Dev', recruiterId: 'rec', ...offer }) },
      jobAlert: { findMany: jest.fn().mockResolvedValue([
        { ...alert, userId: 'u1', stack: ['angular'] },
        { ...alert, userId: 'u1', country: 'SN' },
        { ...alert, userId: 'u2', stack: ['django'] },
      ]) },
    };
    const events = { emit: jest.fn() };
    const service = new JobAlertsService(prisma as never, { getRates: () => rates, convert: currency.convert.bind(currency) } as never, {} as never, {} as never, events as never);
    await service.onOfferPublished({ jobId: 'j1', recruiterId: 'rec' });
    expect(events.emit).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith('jobs.alert.matched', { userId: 'u1', jobId: 'j1', jobTitle: 'Dev' });
  });

  it('emails only offers published since the last digest', async () => {
    const now = new Date('2026-10-26T08:00:00Z');
    const lastDigest = new Date('2026-10-22T08:00:00Z');
    const prisma = {
      jobAlert: {
        findMany:   jest.fn().mockResolvedValue([{ ...alert, userId: 'u1', lastDigestAt: lastDigest, user: { email: 'u1@x.io' } }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      jobOffer: { findMany: jest.fn().mockResolvedValue([
        { id: 'new', title: 'Nouvelle', company: 'A', recruiterId: 'r', publishedAt: new Date('2026-10-24'), salaryMin: 1, ...offer },
        { id: 'old', title: 'Ancienne', company: 'B', recruiterId: 'r', publishedAt: new Date('2026-10-20'), salaryMin: 1, ...offer },
      ]) },
    };
    const mail = { send: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue('https://afridevhub.com') };
    const service = new JobAlertsService(prisma as never, { getRates: () => rates, convert: currency.convert.bind(currency) } as never, mail as never, config as never, { emit: jest.fn() } as never);

    await expect(service.sendWeeklyDigest(now)).resolves.toBe(1);
    const html = mail.send.mock.calls[0][2] as string;
    expect(html).toContain('/jobs/new');
    expect(html).not.toContain('/jobs/old');
    expect(prisma.jobAlert.updateMany).toHaveBeenCalledWith({ where: { userId: 'u1', isActive: true }, data: { lastDigestAt: now } });
  });
});
