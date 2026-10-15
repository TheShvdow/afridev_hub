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
