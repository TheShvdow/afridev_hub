import { VotesService } from './votes.service';

function build(overrides: { reputation?: number; ownerId?: string | null; existing?: { value: string } | null } = {}) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue({ reputation: overrides.reputation ?? 20 }) },
    post: { findUnique: jest.fn().mockResolvedValue(overrides.ownerId === null ? null : { userId: overrides.ownerId ?? 'owner' }) },
    answer: { findUnique: jest.fn() },
    vote: {
      findUnique: jest.fn().mockResolvedValue(overrides.existing ?? null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const events = { emit: jest.fn() };
  return { service: new VotesService(prisma as never, events as never), prisma, events };
}

describe('VotesService', () => {
  it('refuses to vote below 10 reputation points', async () => {
    const { service, prisma } = build({ reputation: 9 });
    await expect(service.vote('voter', 'POST', 'p1', 1)).rejects.toMatchObject({ code: 'VOTES_REPUTATION_TOO_LOW' });
    expect(prisma.vote.create).not.toHaveBeenCalled();
  });

  it('refuses to vote on one’s own content', async () => {
    const { service } = build({ ownerId: 'voter' });
    await expect(service.vote('voter', 'POST', 'p1', 1)).rejects.toMatchObject({ code: 'VOTES_SELF_VOTE_FORBIDDEN' });
  });

  it('reports a missing target', async () => {
    const { service } = build({ ownerId: null });
    await expect(service.vote('voter', 'POST', 'p1', 1)).rejects.toMatchObject({ code: 'VOTES_TARGET_NOT_FOUND' });
  });

  it('records a new vote and emits votes.vote.changed without touching reputation', async () => {
    const { service, prisma, events } = build();
    const result = await service.vote('voter', 'POST', 'p1', 1);
    expect(result.action).toBe('added');
    expect(prisma.vote.create).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith('votes.vote.changed', {
      targetOwnerId: 'owner', entityType: 'POST', entityId: 'p1', previous: null, next: 'UP',
    });
  });

  it('emits a cancellation when the same vote is sent twice', async () => {
    const { service, prisma, events } = build({ existing: { value: 'UP' } });
    const result = await service.vote('voter', 'POST', 'p1', 1);
    expect(result.action).toBe('removed');
    expect(prisma.vote.delete).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith('votes.vote.changed', expect.objectContaining({ previous: 'UP', next: null }));
  });
});
