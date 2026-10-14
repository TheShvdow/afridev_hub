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
