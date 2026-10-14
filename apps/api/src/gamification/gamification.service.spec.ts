import { GamificationService } from './gamification.service';

function build() {
  const prisma = {
    $transaction: jest.fn().mockResolvedValue([{ id: 'u1', reputation: 25 }, {}]),
    user: { update: jest.fn() },
    reputationEvent: { create: jest.fn() },
    badge: { findUnique: jest.fn().mockResolvedValue(null) },
    userBadge: { findUnique: jest.fn(), create: jest.fn() },
  };
  const events = { emit: jest.fn() };
  return { service: new GamificationService(prisma as never, events as never), prisma, events };
}

describe('GamificationService — addPoints (story E2-5)', () => {
  it('writes the reputation through a transaction with its history entry', async () => {
    const { service, prisma } = build();
    await service.addPoints('u1', 10, 'answer_posted', 'a1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('emits gamification.reputation.updated with the new score', async () => {
    const { service, events } = build();
    await service.addPoints('u1', 10, 'answer_posted', 'a1');
    expect(events.emit).toHaveBeenCalledWith('gamification.reputation.updated', {
      userId: 'u1', reputation: 25, delta: 10, reason: 'answer_posted',
    });
  });
});
