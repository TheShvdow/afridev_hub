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
