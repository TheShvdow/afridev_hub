import { Prisma } from '@prisma/client';
import { ModerationService } from './moderation.service';

// $transaction reçoit les requêtes déjà construites : on les exécute en séquence pour les vérifier.
function makePrisma() {
  const moderationCreate = jest.fn().mockResolvedValue({ id: 'm1' });
  const auditCreate = jest.fn().mockResolvedValue({ id: 'a1' });
  const prisma = {
    moderationAction: { create: moderationCreate },
    auditLog:         { create: auditCreate },
    $transaction:     jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma, moderationCreate, auditCreate };
}

describe('ModerationService — cibles des actions', () => {
  it('records a ban against the USER target type', async () => {
    const { prisma, moderationCreate } = makePrisma();
    const service = new ModerationService(prisma as never);
    await service.banUser('target', 'mod', 'Spam répété');
    expect(moderationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ entityType: 'USER', entityId: 'target', moderatorId: 'mod' }),
    });
  });

  it('records an unban against the USER target type', async () => {
    const { prisma, moderationCreate } = makePrisma();
    const service = new ModerationService(prisma as never);
    await service.unbanUser('target', 'mod');
    expect(moderationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ entityType: 'USER', entityId: 'target' }),
    });
  });
});

describe('ModerationService — traçabilité des bans', () => {
  it('journalise le ban avec le modérateur, la cible et le motif', async () => {
    const { prisma, auditCreate } = makePrisma();
    const service = new ModerationService(prisma as never);
    await service.banUser('target', 'mod', 'Spam répété');
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        userId:     'mod',
        action:     'USER_BANNED',
        entityType: 'USER',
        entityId:   'target',
        metadata:   { reason: 'Spam répété' },
      },
    });
  });

  it('journalise la levée de ban', async () => {
    const { prisma, auditCreate } = makePrisma();
    const service = new ModerationService(prisma as never);
    await service.unbanUser('target', 'mod');
    expect(auditCreate).toHaveBeenCalledWith({
      data: { userId: 'mod', action: 'USER_UNBANNED', entityType: 'USER', entityId: 'target' },
    });
  });

  it('écrit l\'action et sa trace dans la même transaction', async () => {
    const { prisma } = makePrisma();
    const service = new ModerationService(prisma as never);
    await service.banUser('target', 'mod', 'Spam répété');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(2);
  });
});

describe('ModerationService — signalements (FR-20/FR-21)', () => {
  function build(opts: { openReports?: number; hidden?: boolean; status?: string; createError?: unknown } = {}) {
    const prisma = {
      post:   { findUnique: jest.fn().mockResolvedValue({ isHidden: opts.hidden ?? false }), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      answer: { findUnique: jest.fn(), updateMany: jest.fn() },
      project:{ findUnique: jest.fn(), updateMany: jest.fn() },
      report: {
        create: opts.createError
          ? jest.fn().mockRejectedValue(opts.createError)
          : jest.fn().mockResolvedValue({ id: 'r1' }),
        count:      jest.fn().mockResolvedValue(opts.openReports ?? 1),
        findUnique: jest.fn().mockResolvedValue({ id: 'r1', entityType: 'POST', entityId: 'p1', status: opts.status ?? 'PENDING' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      moderationAction: { create: jest.fn().mockResolvedValue({ id: 'm1' }) },
      auditLog:         { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
      $transaction:     jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    return { service: new ModerationService(prisma as never), prisma };
  }
  const dto = { entityType: 'POST', entityId: 'p1', reason: 'SPAM' } as never;

  it('hides the content automatically at the third open report', async () => {
    const { service, prisma } = build({ openReports: 3 });
    await service.createReport('u3', dto);
    expect(prisma.post.updateMany).toHaveBeenCalledWith({
      where: { id: 'p1' }, data: { isHidden: true, hiddenAt: expect.any(Date) },
    });
    expect(prisma.moderationAction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ moderatorId: null, action: 'HIDDEN' }),
    });
  });

  it('leaves the content visible below the threshold', async () => {
    const { service, prisma } = build({ openReports: 2 });
    await service.createReport('u2', dto);
    expect(prisma.post.updateMany).not.toHaveBeenCalled();
  });

  it('returns 409 when the member already reported the content', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' });
    const { service } = build({ createError: duplicate });
    await expect(service.createReport('u1', dto)).rejects.toMatchObject({ status: 409, code: 'MODERATION_REPORT_DUPLICATE' });
  });

  it('dismisses with a DISMISSED action and makes the content visible again', async () => {
    const { service, prisma } = build();
    await service.dismissReport('r1', 'mod');
    expect(prisma.moderationAction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'DISMISSED' }) });
    expect(prisma.post.updateMany).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isHidden: false, hiddenAt: null } });
    expect(prisma.report.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'DISMISSED' } }));
  });

  it('hides the content and closes every open report on it when resolved with HIDDEN', async () => {
    const { service, prisma } = build();
    await service.resolveReport('r1', 'mod', 'HIDDEN');
    expect(prisma.post.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isHidden: true }) }));
    expect(prisma.report.updateMany).toHaveBeenCalledWith({
      where: { entityType: 'POST', entityId: 'p1', status: { in: ['PENDING', 'REVIEWED'] } },
      data:  { status: 'RESOLVED' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it('refuses to process a report twice', async () => {
    const { service } = build({ status: 'RESOLVED' });
    await expect(service.resolveReport('r1', 'mod', 'HIDDEN')).rejects.toMatchObject({ code: 'MODERATION_REPORT_ALREADY_CLOSED' });
  });
});

// Story 7.13 : une offre peut être signalée, et chaque signalement indique où se trouve son contenu.
describe('ModerationService — offres signalées', () => {
  function build(opts: { jobStatus?: string; openReports?: number } = {}) {
    const prisma = {
      jobOffer: {
        findUnique: jest.fn().mockResolvedValue({ status: opts.jobStatus ?? 'ACTIVE' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      report: {
        create: jest.fn().mockResolvedValue({ id: 'r1' }),
        count: jest.fn().mockResolvedValue(opts.openReports ?? 1),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      moderationAction: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    return { prisma, service: new ModerationService(prisma as never) };
  }

  it('accepts a report on an offer', async () => {
    const { prisma, service } = build();
    await service.createReport('u1', { entityType: 'JOB', entityId: 'j1', reason: 'SPAM' } as never);
    expect(prisma.report.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entityType: 'JOB', entityId: 'j1' }) });
    expect(prisma.jobOffer.updateMany).not.toHaveBeenCalled();
  });

  it('sends the offer back to review once the threshold of reports is reached', async () => {
    const { prisma, service } = build({ openReports: 3 });
    await service.createReport('u1', { entityType: 'JOB', entityId: 'j1', reason: 'SPAM' } as never);
    expect(prisma.jobOffer.updateMany).toHaveBeenCalledWith({
      where: { id: 'j1', status: 'ACTIVE' },
      data: { status: 'PENDING_REVIEW' },
    });
  });

  it('does not hide an offer that is already out of public view', async () => {
    const { prisma, service } = build({ jobStatus: 'PENDING_REVIEW', openReports: 5 });
    await service.createReport('u1', { entityType: 'JOB', entityId: 'j1', reason: 'SPAM' } as never);
    expect(prisma.jobOffer.updateMany).not.toHaveBeenCalled();
  });

  it('puts a held offer back online when the report is dismissed, and never a refused one', async () => {
    const { prisma, service } = build();
    prisma.report.findUnique.mockResolvedValue({ id: 'r1', status: 'PENDING', entityType: 'JOB', entityId: 'j1' });
    await service.dismissReport('r1', 'mod');
    expect(prisma.jobOffer.updateMany).toHaveBeenCalledWith({
      where: { id: 'j1', status: 'PENDING_REVIEW' },
      data: { status: 'ACTIVE' },
    });
  });
});

describe('ModerationService — lien vers la cible d\'un signalement', () => {
  it('gives the parent question of an answer, the slug of a project and the offer id', async () => {
    const reports = [
      { id: 'r1', entityType: 'POST', entityId: 'p1' },
      { id: 'r2', entityType: 'ANSWER', entityId: 'a1' },
      { id: 'r3', entityType: 'PROJECT', entityId: 'pr1' },
      { id: 'r4', entityType: 'JOB', entityId: 'j1' },
      { id: 'r5', entityType: 'POST', entityId: 'deleted' },
    ];
    const prisma = {
      report: { findMany: jest.fn().mockResolvedValue(reports), count: jest.fn().mockResolvedValue(5) },
      post: { findMany: jest.fn().mockResolvedValue([{ id: 'p1', title: 'Question' }]) },
      answer: { findMany: jest.fn().mockResolvedValue([{ id: 'a1', postId: 'p9', post: { title: 'Question mère' } }]) },
      project: { findMany: jest.fn().mockResolvedValue([{ id: 'pr1', slug: 'wolof-api', name: 'Wolof API' }]) },
      jobOffer: { findMany: jest.fn().mockResolvedValue([{ id: 'j1', title: 'Dev Angular' }]) },
    };
    const result = await new ModerationService(prisma as never).listReports('PENDING');
    const target = (id: string) => result.data.find((r) => r.id === id)!.target;

    expect(target('r1')).toEqual({ title: 'Question', postId: 'p1' });
    expect(target('r2')).toEqual({ title: 'Question mère', postId: 'p9' });
    expect(target('r3')).toEqual({ title: 'Wolof API', slug: 'wolof-api' });
    expect(target('r4')).toEqual({ title: 'Dev Angular', jobId: 'j1' });
    expect(target('r5')).toBeNull();
  });

  it('asks for each kind of target once, and not at all when there is none', async () => {
    const prisma = {
      report: { findMany: jest.fn().mockResolvedValue([{ id: 'r1', entityType: 'POST', entityId: 'p1' }, { id: 'r2', entityType: 'POST', entityId: 'p1' }]), count: jest.fn().mockResolvedValue(2) },
      post: { findMany: jest.fn().mockResolvedValue([]) },
      answer: { findMany: jest.fn() },
      project: { findMany: jest.fn() },
      jobOffer: { findMany: jest.fn() },
    };
    await new ModerationService(prisma as never).listReports('PENDING');
    expect(prisma.post.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.post.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['p1'] } } }));
    expect(prisma.answer.findMany).not.toHaveBeenCalled();
    expect(prisma.project.findMany).not.toHaveBeenCalled();
    expect(prisma.jobOffer.findMany).not.toHaveBeenCalled();
  });
});
