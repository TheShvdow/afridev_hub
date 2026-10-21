import { JobsScheduler } from './jobs.scheduler';

describe('JobsScheduler (FR-33)', () => {
  it('expires active offers whose date has passed', async () => {
    const prisma = { jobOffer: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) } };
    const scheduler = new JobsScheduler(prisma as never, {} as never, {} as never, {} as never);
    const now = new Date();
    await expect(scheduler.expireOffers(now)).resolves.toBe(2);
    expect(prisma.jobOffer.updateMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data:  { status: 'EXPIRED' },
    });
  });

  it('sends the day-50 reminder once and records it', async () => {
    const now = new Date('2026-10-21T09:00:00Z');
    const prisma = { jobOffer: {
      findMany: jest.fn().mockResolvedValue([{ id: 'j1', title: 'Dev', expiresAt: new Date('2026-10-30'), recruiter: { email: 'r@x.io' } }]),
      update:   jest.fn().mockResolvedValue({}),
    } };
    const mail = { send: jest.fn().mockResolvedValue(undefined) };
    const scheduler = new JobsScheduler(prisma as never, mail as never, { get: () => 'https://afridevhub.com' } as never, {} as never);
    await expect(scheduler.sendExpiryReminders(now)).resolves.toBe(1);
    expect(prisma.jobOffer.findMany.mock.calls[0][0].where).toMatchObject({ status: 'ACTIVE', expiryReminderSentAt: null });
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({ where: { id: 'j1' }, data: { expiryReminderSentAt: now } });
  });
});
