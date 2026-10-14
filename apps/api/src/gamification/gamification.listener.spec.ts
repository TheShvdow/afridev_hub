import { GamificationListener } from './gamification.listener';

describe('GamificationListener (règles du glossaire)', () => {
  let addReputation: jest.Mock;
  let listener: GamificationListener;

  beforeEach(() => {
    addReputation = jest.fn().mockResolvedValue({ id: 'u', reputation: 0 });
    listener = new GamificationListener({ addReputation } as never);
  });

  it('gives +5 for a question asked', async () => {
    await listener.onQuestionCreated({ authorId: 'u1', postId: 'p1' });
    expect(addReputation).toHaveBeenCalledWith({ userId: 'u1', delta: 5, reason: 'question_asked', entityId: 'p1' });
  });

  it('gives +10 for an answer given', async () => {
    await listener.onAnswerCreated({ authorId: 'u1', answerId: 'a1', postId: 'p1' });
    expect(addReputation).toHaveBeenCalledWith({ userId: 'u1', delta: 10, reason: 'answer_given', entityId: 'a1' });
  });

  it('gives +15 to the answer author when accepted', async () => {
    await listener.onAnswerAccepted({ answerAuthorId: 'u2', answerId: 'a1', postId: 'p1' });
    expect(addReputation).toHaveBeenCalledWith({ userId: 'u2', delta: 15, reason: 'answer_accepted', entityId: 'a1' });
  });

  it.each([
    ['new upvote', null, 'UP', 10],
    ['new downvote', null, 'DOWN', -2],
    ['upvote cancelled', 'UP', null, -10],
    ['downvote cancelled', 'DOWN', null, 2],
    ['downvote changed to upvote', 'DOWN', 'UP', 12],
    ['upvote changed to downvote', 'UP', 'DOWN', -12],
  ])('computes the delta for %s', async (_label, previous, next, delta) => {
    await listener.onVoteChanged({
      targetOwnerId: 'owner', entityType: 'POST', entityId: 'p1',
      previous: previous as never, next: next as never,
    });
    expect(addReputation).toHaveBeenCalledWith({ userId: 'owner', delta, reason: 'vote_changed', entityId: 'p1' });
  });

  it('does nothing when the vote change leaves the score unchanged', async () => {
    await listener.onVoteChanged({ targetOwnerId: 'o', entityType: 'POST', entityId: 'p', previous: null, next: null });
    expect(addReputation).not.toHaveBeenCalled();
  });

  it('swallows a failure so the business action is not rolled back', async () => {
    addReputation.mockRejectedValueOnce(new Error('db down'));
    await expect(listener.onQuestionCreated({ authorId: 'u1', postId: 'p1' })).resolves.toBeUndefined();
  });
});
