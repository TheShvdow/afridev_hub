import { GamificationService } from './gamification.service';
import { GamificationListener } from './gamification.listener';

const complete = {
  isVerified: true, country: 'SN', stack: ['TypeScript'], bio: 'x'.repeat(60),
  githubUsername: 'idrissa', linkedinUsername: null, twitterUsername: null, websiteUrl: null,
};

function build(profile: Record<string, unknown> | null, earned: boolean, badgeExists = true) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(profile) },
    badge: { findUnique: jest.fn().mockResolvedValue(badgeExists ? { id: 'b1' } : null) },
    userBadge: {
      findUnique: jest.fn().mockResolvedValue(earned ? { userId: 'u1', badgeId: 'b1' } : null),
      create: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
  return { service: new GamificationService(prisma as never, { emit: jest.fn() } as never), prisma };
}

describe('GamificationService.syncVerifiedBadge', () => {
  it('awards the badge to a complete profile that does not have it yet', async () => {
    const { service, prisma } = build(complete, false);
    await service.syncVerifiedBadge('u1');
    expect(prisma.userBadge.create).toHaveBeenCalledWith({ data: { userId: 'u1', badgeId: 'b1' } });
  });

  it('revokes the badge when a condition is lost', async () => {
    const { service, prisma } = build({ ...complete, country: null }, true);
    await service.syncVerifiedBadge('u1');
    expect(prisma.userBadge.delete).toHaveBeenCalled();
    expect(prisma.userBadge.create).not.toHaveBeenCalled();
  });

  it('changes nothing when the state already matches', async () => {
    const { service, prisma } = build(complete, true);
    await service.syncVerifiedBadge('u1');
    expect(prisma.userBadge.create).not.toHaveBeenCalled();
    expect(prisma.userBadge.delete).not.toHaveBeenCalled();
  });

  it('does nothing when the seed has not created the badge', async () => {
    const { service, prisma } = build(complete, false, false);
    await service.syncVerifiedBadge('u1');
    expect(prisma.userBadge.create).not.toHaveBeenCalled();
  });
});

describe('GamificationListener — profile and verification triggers', () => {
  it('re-evaluates the badge on profile update and on email verification', async () => {
    const sync = jest.fn().mockResolvedValue(undefined);
    const listener = new GamificationListener({ syncVerifiedBadge: sync } as never);
    await listener.onProfileUpdated({ userId: 'u1' });
    await listener.onEmailVerified({ userId: 'u2' });
    expect(sync).toHaveBeenNthCalledWith(1, 'u1');
    expect(sync).toHaveBeenNthCalledWith(2, 'u2');
  });
});
