import { JobsService } from './jobs.service';
import { RatesSnapshot } from '../currency/currency.service';

const rates: RatesSnapshot = { perUsd: new Map([['USD', 1], ['XOF', 600], ['NGN', 1500]]), updatedAt: new Date('2026-10-21') };

function build(opts: {
  job?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
  offersThisMonth?: number;
  existingApplication?: unknown;
} = {}) {
  const prisma = {
    jobOffer: {
      findUnique: jest.fn().mockResolvedValue(opts.job ?? null),
      findMany:   jest.fn().mockResolvedValue([]),
      count:      jest.fn().mockResolvedValue(opts.offersThisMonth ?? 0),
      create:     jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'j1', ...data })),
      update:     jest.fn().mockResolvedValue({ id: 'j1' }),
    },
    jobApplication: {
      findUnique: jest.fn().mockResolvedValue(opts.existingApplication ?? null),
      create:     jest.fn().mockResolvedValue({ id: 'app1', cvUrl: 'cvs/u2/x.pdf', message: 'm' }),
    },
    user:          { findUnique: jest.fn().mockResolvedValue(opts.user ?? { isRecruiter: true }) },
    recruiterPlan: { findUnique: jest.fn().mockResolvedValue(opts.plan ?? null) },
    auditLog:      { create: jest.fn().mockResolvedValue({}) },
    $transaction:  jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const currency = {
    getRates: jest.fn().mockResolvedValue(rates),
    toUsd:    jest.fn((amount: number, from: string) => Math.round(amount / (rates.perUsd.get(from) ?? NaN)) || null),
    convert:  jest.fn((amount: number, from: string, to: string) =>
      Math.round((amount / (rates.perUsd.get(from) ?? NaN)) * (rates.perUsd.get(to) ?? NaN)) || null),
  };
  const uploads = { confirmCv: jest.fn((_u: string, key: string) => Promise.resolve(key)), cvDownloadUrl: jest.fn() };
  const events = { emit: jest.fn() };
  const service = new JobsService(prisma as never, currency as never, uploads as never, events as never);
  return { service, prisma, events, uploads };
}

const offer = {
  id: 'j1', recruiterId: 'owner', title: 'Dev NestJS', status: 'ACTIVE', currency: 'XOF',
  salaryMin: 500000, salaryMax: 800000, expiresAt: new Date(Date.now() + 86_400_000),
};
const createDto = {
  title: 'Développeur NestJS', description: 'x'.repeat(120), company: 'Acme', country: 'SN',
  type: 'FULL_TIME', mode: 'REMOTE', salaryMin: 600000, salaryMax: 900000, currency: 'XOF', stack: [' NestJS', 'Docker', 'nestjs'],
};

describe('JobsService — publication (FR-28, FR-34)', () => {
  it('requires an active recruiter profile', async () => {
    const { service } = build({ user: { isRecruiter: false } });
    await expect(service.create('u1', createDto as never)).rejects.toMatchObject({ code: 'JOBS_RECRUITER_REQUIRED', status: 403 });
  });

  it('blocks the 4th offer of the month on the free plan with 402', async () => {
    const { service, prisma } = build({ offersThisMonth: 3 });
    await expect(service.create('u1', createDto as never)).rejects.toMatchObject({ code: 'JOBS_PLAN_LIMIT_REACHED', status: 402 });
    expect(prisma.jobOffer.create).not.toHaveBeenCalled();
  });

  it('lets a premium recruiter publish beyond the free quota', async () => {
    const { service, prisma } = build({ offersThisMonth: 10, plan: { planType: 'PREMIUM', isActive: true, expiresAt: null } });
    await service.create('u1', createDto as never);
    expect(prisma.jobOffer.create).toHaveBeenCalled();
  });

  it('creates the offer pending review, with a lowercase stack and salaries in USD', async () => {
    const { service, prisma } = build();
    await service.create('u1', createDto as never);
    expect(prisma.jobOffer.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PENDING_REVIEW', stack: ['nestjs', 'docker'], salaryMinUsd: 1000, salaryMaxUsd: 1500 }),
    }));
  });

  it('publishes on approval and starts the 60 days from now', async () => {
    const { service, prisma, events } = build({ job: { ...offer, status: 'PENDING_REVIEW' } });
    await service.approve('j1', 'mod');
    const data = prisma.jobOffer.update.mock.calls[0][0].data;
    expect(data.status).toBe('ACTIVE');
    expect(data.expiresAt.getTime() - data.publishedAt.getTime()).toBe(60 * 86_400_000);
    expect(events.emit).toHaveBeenCalledWith('jobs.offer.published', { jobId: 'j1', recruiterId: 'owner' });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('refuses to approve an offer that is not pending', async () => {
    const { service } = build({ job: offer });
    await expect(service.approve('j1', 'mod')).rejects.toMatchObject({ code: 'JOBS_OFFER_NOT_PENDING' });
  });
});

describe('JobsService — modification, fermeture et renouvellement', () => {
  it('refuses an update from someone else than the recruiter', async () => {
    const { service, prisma } = build({ job: offer });
    await expect(service.update('j1', 'intrus', { title: 'x' } as never)).rejects.toMatchObject({ code: 'JOBS_FORBIDDEN' });
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it('applies only the fields provided', async () => {
    const { service, prisma } = build({ job: offer });
    await service.update('j1', 'owner', { title: 'Nouveau titre', mode: 'REMOTE' } as never);
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { title: 'Nouveau titre', mode: 'REMOTE' },
    });
  });

  it('sends a rejected offer back to review when it is corrected', async () => {
    const { service, prisma } = build({ job: { ...offer, status: 'REJECTED' } });
    await service.update('j1', 'owner', { title: 'Corrigé' } as never);
    expect(prisma.jobOffer.update.mock.calls[0][0].data).toMatchObject({ status: 'PENDING_REVIEW', rejectionReason: null });
  });

  it('checks the salary range against the final values, even when only one bound changes', async () => {
    const { service, prisma } = build({ job: offer });
    await expect(service.update('j1', 'owner', { salaryMin: 900000 } as never)).rejects.toMatchObject({
      code: 'JOBS_SALARY_RANGE_INVALID',
    });
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it('closes an offer for its recruiter only', async () => {
    const { service, prisma } = build({ job: offer });
    await service.close('j1', 'owner');
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({ where: { id: 'j1' }, data: { status: 'CLOSED' } });
    await expect(service.close('j1', 'intrus')).rejects.toMatchObject({ code: 'JOBS_FORBIDDEN' });
  });

  it('renews an expired offer for 60 days', async () => {
    const { service, prisma } = build({ job: { ...offer, status: 'EXPIRED' } });
    await service.renew('j1', 'owner');
    expect(prisma.jobOffer.update.mock.calls[0][0].data).toMatchObject({ status: 'ACTIVE', expiryReminderSentAt: null });
  });

  it('does not renew a closed offer', async () => {
    const { service } = build({ job: { ...offer, status: 'CLOSED' } });
    await expect(service.renew('j1', 'owner')).rejects.toMatchObject({ code: 'JOBS_OFFER_NOT_RENEWABLE' });
  });
});

describe('JobsService — candidatures (FR-31)', () => {
  it('stores the checked CV key and notifies the recruiter through an event', async () => {
    const { service, uploads, events } = build({ job: offer });
    const result = await service.apply('j1', 'u2', { message: 'Bonjour', cvKey: 'cvs/u2/x.pdf' });
    expect(uploads.confirmCv).toHaveBeenCalledWith('u2', 'cvs/u2/x.pdf');
    expect(result).toMatchObject({ hasCv: true });
    expect(result).not.toHaveProperty('cvUrl');
    expect(events.emit).toHaveBeenCalledWith('jobs.application.created', expect.objectContaining({ recruiterId: 'owner', applicantId: 'u2' }));
  });

  it('returns 409 on a second application', async () => {
    const { service } = build({ job: offer, existingApplication: { id: 'a0' } });
    await expect(service.apply('j1', 'u2', { message: 'x' })).rejects.toMatchObject({ code: 'JOBS_ALREADY_APPLIED', status: 409 });
  });

  it('refuses an application to an expired offer', async () => {
    const { service } = build({ job: { ...offer, expiresAt: new Date(Date.now() - 1000) } });
    await expect(service.apply('j1', 'u2', { message: 'x' })).rejects.toMatchObject({ code: 'JOBS_OFFER_CLOSED' });
  });

  it('refuses an application from the recruiter of the offer', async () => {
    const { service } = build({ job: offer });
    await expect(service.apply('j1', 'owner', { message: 'x' })).rejects.toMatchObject({ code: 'JOBS_FORBIDDEN' });
  });
});

describe('JobsService — liste publique (FR-29, FR-30)', () => {
  it('shows only published, unexpired offers and filters salaries across currencies', async () => {
    const { service, prisma } = build();
    await service.list({ salaryMin: 600000, currency: 'XOF', stack: ['nestjs'] } as never, null);
    const where = prisma.jobOffer.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ status: 'ACTIVE', expiresAt: { gt: expect.any(Date) }, stack: { hasSome: ['nestjs'] } });
    expect(where.AND).toContainEqual({ salaryMaxUsd: { gte: 1000 } });
  });

  it('adds the salary converted into the requested currency', async () => {
    const { service, prisma } = build();
    prisma.jobOffer.findMany.mockResolvedValue([{ ...offer }]);
    const result = await service.list({ currency: 'NGN' } as never, null);
    expect(result.data[0].converted).toMatchObject({ currency: 'NGN', salaryMin: 1250000, salaryMax: 2000000 });
  });

  it('hides an offer pending review from other members', async () => {
    const { service } = build({ job: { ...offer, status: 'PENDING_REVIEW', recruiter: {} } });
    await expect(service.findOne('j1', { id: 'other', role: 'MEMBER' })).rejects.toMatchObject({ code: 'JOBS_OFFER_NOT_FOUND' });
    await expect(service.findOne('j1', { id: 'owner', role: 'MEMBER' })).resolves.toMatchObject({ id: 'j1' });
  });
});

describe('JobsService — liste filtrée par pays', () => {
  it('restricts the published offers to the chosen country', async () => {
    const { service, prisma } = build();
    await service.list({ country: 'CI' } as never, null);
    expect(prisma.jobOffer.count).toHaveBeenCalledWith({
      where: { status: 'ACTIVE', expiresAt: { gt: expect.any(Date) }, country: 'CI' },
    });
  });

  it('combines the country with the other filters', async () => {
    const { service, prisma } = build();
    await service.list({ type: 'FULL_TIME', mode: 'REMOTE', search: 'angular', country: 'SN' } as never, null);
    expect(prisma.jobOffer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: 'ACTIVE', type: 'FULL_TIME', mode: 'REMOTE', country: 'SN' }),
    });
  });

  it('returns every country when none is chosen', async () => {
    const { service, prisma } = build();
    await service.list({} as never, null);
    expect(prisma.jobOffer.count).toHaveBeenCalledWith({ where: { status: 'ACTIVE', expiresAt: { gt: expect.any(Date) } } });
  });
});
