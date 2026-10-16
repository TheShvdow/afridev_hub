import { JobsService } from './jobs.service';

function build(job: Record<string, unknown> | null) {
  const prisma = {
    jobOffer: {
      findUnique: jest.fn().mockResolvedValue(job),
      update: jest.fn().mockResolvedValue({ id: 'j1' }),
    },
  };
  return { service: new JobsService(prisma as never), prisma };
}

const offer = { id: 'j1', recruiterId: 'owner', salaryMin: 500000, salaryMax: 800000 };

describe('JobsService — modification et fermeture', () => {
  it('refuses an update from someone else than the recruiter', async () => {
    const { service, prisma } = build(offer);
    await expect(service.update('j1', 'intrus', { title: 'x' } as never)).rejects.toMatchObject({ code: 'JOBS_FORBIDDEN' });
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it('applies only the fields provided', async () => {
    const { service, prisma } = build(offer);
    await service.update('j1', 'owner', { title: 'Nouveau titre', mode: 'REMOTE' } as never);
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({
      where: { id: 'j1' },
      data: { title: 'Nouveau titre', mode: 'REMOTE' },
    });
  });

  it('checks the salary range against the final values, even when only one bound changes', async () => {
    const { service, prisma } = build(offer);
    await expect(service.update('j1', 'owner', { salaryMin: 900000 } as never)).rejects.toMatchObject({
      code: 'JOBS_SALARY_RANGE_INVALID',
    });
    expect(prisma.jobOffer.update).not.toHaveBeenCalled();
  });

  it('closes an offer for its recruiter only', async () => {
    const { service, prisma } = build(offer);
    await service.close('j1', 'owner');
    expect(prisma.jobOffer.update).toHaveBeenCalledWith({ where: { id: 'j1' }, data: { status: 'CLOSED' } });
    await expect(service.close('j1', 'intrus')).rejects.toMatchObject({ code: 'JOBS_FORBIDDEN' });
  });
});

describe('JobsService — liste filtrée par pays', () => {
  function buildList() {
    const prisma = {
      jobOffer: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    return { service: new JobsService(prisma as never), prisma };
  }

  it('restricts the active offers to the chosen country', async () => {
    const { service, prisma } = buildList();
    await service.list(1, 20, undefined, undefined, undefined, 'CI');
    const where = { status: 'ACTIVE', country: 'CI' };
    expect(prisma.jobOffer.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }));
    expect(prisma.jobOffer.count).toHaveBeenCalledWith({ where });
  });

  it('combines the country with the other filters', async () => {
    const { service, prisma } = buildList();
    await service.list(1, 20, 'FULL_TIME' as never, 'REMOTE' as never, 'angular', 'SN');
    expect(prisma.jobOffer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: 'ACTIVE', type: 'FULL_TIME', mode: 'REMOTE', country: 'SN' }),
    });
  });

  it('returns every country when none is chosen', async () => {
    const { service, prisma } = buildList();
    await service.list(1, 20);
    expect(prisma.jobOffer.count).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
  });
});
