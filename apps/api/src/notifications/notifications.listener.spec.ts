import { NotificationsListener } from './notifications.listener';

describe('NotificationsListener — votes', () => {
  function build() {
    const notifications = { notifyUpvote: jest.fn().mockResolvedValue({}) };
    const prisma = { answer: { findUnique: jest.fn().mockResolvedValue({ postId: 'p1' }) } };
    return { listener: new NotificationsListener(notifications as never, prisma as never), notifications };
  }
  const base = { voterId: 'voter', targetOwnerId: 'owner', entityType: 'ANSWER' as const, entityId: 'a1' };

  it('notifies a new upvote with a link to the question', async () => {
    const { listener, notifications } = build();
    await listener.onVoteChanged({ ...base, previous: null, next: 'UP' });
    expect(notifications.notifyUpvote).toHaveBeenCalledWith('owner', 'ANSWER', 'a1', 'p1', 'voter');
  });

  it.each([
    ['a downvote',          { previous: null, next: 'DOWN' }],
    ['a cancelled upvote',  { previous: 'UP', next: null }],
  ] as const)('ignores %s', async (_label, change) => {
    const { listener, notifications } = build();
    await listener.onVoteChanged({ ...base, ...change });
    expect(notifications.notifyUpvote).not.toHaveBeenCalled();
  });
});

describe('NotificationsListener — accusé de réception', () => {
  const event = { applicationId: 'app-1', jobId: 'job-1', jobTitle: 'Dev', recruiterId: 'rec', applicantId: 'cand' };

  it('sends the receipt for a new application', async () => {
    const notifications = { sendApplicationReceipt: jest.fn().mockResolvedValue(undefined) };
    const listener = new NotificationsListener(notifications as never, {} as never);

    await listener.onApplicationReceipt(event);

    expect(notifications.sendApplicationReceipt).toHaveBeenCalledWith('app-1');
  });

  it('does not let a mail failure break the application flow', async () => {
    const notifications = { sendApplicationReceipt: jest.fn().mockRejectedValue(new Error('Resend indisponible')) };
    const listener = new NotificationsListener(notifications as never, {} as never);

    await expect(listener.onApplicationReceipt(event)).resolves.toBeUndefined();
  });
});
