import { ForumService, HIDDEN_CONTENT } from './forum.service';
import { ForumListener } from './forum.listener';

describe('ForumService.createAnswer — règle du glossaire', () => {
  function build(postAuthor: string) {
    const prisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: postAuthor }),
        update:     jest.fn().mockResolvedValue({}),
      },
      answer: { create: jest.fn().mockResolvedValue({ id: 'a1', body: 'x', user: {} }) },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    const events = { emit: jest.fn() };
    return { service: new ForumService(prisma as never, events as never), prisma, events };
  }
  const dto = { body: 'Une réponse suffisamment longue pour passer la validation du forum.' };

  it('refuses an answer from the author of the question', async () => {
    const { service, prisma } = build('author');
    await expect(service.createAnswer('p1', 'author', dto as never)).rejects.toMatchObject({
      code: 'FORUM_SELF_ANSWER_FORBIDDEN',
    });
    expect(prisma.answer.create).not.toHaveBeenCalled();
  });

  it('accepts an answer from another member, bumps activity and emits forum.answer.created', async () => {
    const { service, prisma, events } = build('author');
    await service.createAnswer('p1', 'other', dto as never);
    expect(prisma.post.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'p1' }, data: { lastActivityAt: expect.any(Date) },
    }));
    expect(events.emit).toHaveBeenCalledWith('forum.answer.created', {
      authorId: 'other', answerId: 'a1', postId: 'p1', postAuthorId: 'author',
    });
  });
});

describe('ForumService.listPosts — tri', () => {
  function build() {
    const prisma = {
      post: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };
    return { service: new ForumService(prisma as never, { emit: jest.fn() } as never), prisma };
  }

  it.each([
    ['votes',  [{ voteScore: 'desc' }, { createdAt: 'desc' }]],
    ['active', [{ lastActivityAt: 'desc' }]],
    ['newest', [{ createdAt: 'desc' }]],
  ])('sorts by %s and excludes hidden questions', async (sort, orderBy) => {
    const { service, prisma } = build();
    await service.listPosts({ sort } as never);
    expect(prisma.post.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy, where: expect.objectContaining({ isHidden: false }),
    }));
  });
});

describe('ForumService.getPost — contenu masqué', () => {
  const post = {
    id: 'p1', title: 'Titre', body: 'Corps', isHidden: true,
    answers: [{ id: 'a1', body: 'Visible', isHidden: false }, { id: 'a2', body: 'Spam', isHidden: true }],
  };
  function build() {
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue(post), update: jest.fn().mockResolvedValue({}) },
      vote: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return new ForumService(prisma as never, { emit: jest.fn() } as never);
  }

  it('masks hidden content for members and anonymous visitors', async () => {
    const result = await build().getPost('p1', null);
    expect(result.title).toBe(HIDDEN_CONTENT);
    expect(result.body).toBe(HIDDEN_CONTENT);
    expect(result.answers.map((a) => a.body)).toEqual(['Visible', HIDDEN_CONTENT]);
  });

  it('shows hidden content to moderators', async () => {
    const result = await build().getPost('p1', { id: 'm1', role: 'MODERATOR' });
    expect(result.body).toBe('Corps');
    expect(result.answers[1].body).toBe('Spam');
  });
});

describe('ForumService.getPost — vote du visiteur', () => {
  const post = {
    id: 'p1', title: 'Titre', body: 'Corps', isHidden: false,
    answers: [{ id: 'a1', body: 'Un', isHidden: false }, { id: 'a2', body: 'Deux', isHidden: false }],
  };
  function build(votes: { entityId: string; value: string }[]) {
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue(post), update: jest.fn().mockResolvedValue({}) },
      vote: { findMany: jest.fn().mockResolvedValue(votes) },
    };
    return { service: new ForumService(prisma as never, { emit: jest.fn() } as never), prisma };
  }

  it('returns the viewer vote on the question and on each answer', async () => {
    const { service, prisma } = build([{ entityId: 'p1', value: 'UP' }, { entityId: 'a2', value: 'DOWN' }]);

    const result = await service.getPost('p1', { id: 'u1', role: 'MEMBER' });

    expect(result.userVote).toBe('UP');
    expect(result.answers.map((a) => a.userVote)).toEqual([null, 'DOWN']);
    expect(prisma.vote.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 'u1' }),
    }));
  });

  it('returns no vote and does not query votes for an anonymous visitor', async () => {
    const { service, prisma } = build([]);

    const result = await service.getPost('p1', null);

    expect(result.userVote).toBeNull();
    expect(result.answers.every((a) => a.userVote === null)).toBe(true);
    expect(prisma.vote.findMany).not.toHaveBeenCalled();
  });
});

describe('ForumService.deleteAnswer — propriété ou modération', () => {
  function build(answer: { id: string; userId: string } | null) {
    const prisma = {
      answer: {
        findUnique: jest.fn().mockResolvedValue(answer),
        delete:     jest.fn().mockResolvedValue(answer),
      },
    };
    return { service: new ForumService(prisma as never, { emit: jest.fn() } as never), prisma };
  }

  it('deletes an answer authored by the current user', async () => {
    const { service, prisma } = build({ id: 'a1', userId: 'author' });
    await service.deleteAnswer('a1', 'author', 'MEMBER');
    expect(prisma.answer.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });

  it('lets a moderator delete any answer', async () => {
    const { service, prisma } = build({ id: 'a1', userId: 'author' });
    await service.deleteAnswer('a1', 'mod-1', 'MODERATOR');
    expect(prisma.answer.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
  });

  it('refuses a member who does not own the answer', async () => {
    const { service, prisma } = build({ id: 'a1', userId: 'author' });
    await expect(service.deleteAnswer('a1', 'other', 'MEMBER')).rejects.toMatchObject({
      code: 'FORUM_FORBIDDEN',
    });
    expect(prisma.answer.delete).not.toHaveBeenCalled();
  });

  it('returns a 404 for an unknown answer', async () => {
    const { service } = build(null);
    await expect(service.deleteAnswer('missing', 'author', 'MEMBER')).rejects.toMatchObject({
      code: 'FORUM_ANSWER_NOT_FOUND',
    });
  });
});

describe('ForumListener — voteScore', () => {
  function build() {
    const prisma = {
      post:   { update: jest.fn().mockResolvedValue({}) },
      answer: { update: jest.fn().mockResolvedValue({}) },
    };
    return { listener: new ForumListener(prisma as never), prisma };
  }
  const base = { voterId: 'v', targetOwnerId: 'o', entityId: 'e1' };

  it('adds 2 when a downvote becomes an upvote', async () => {
    const { listener, prisma } = build();
    await listener.onVoteChanged({ ...base, entityType: 'ANSWER', previous: 'DOWN', next: 'UP' });
    expect(prisma.answer.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { voteScore: { increment: 2 } } });
  });

  it('removes 1 when an upvote is cancelled on a question', async () => {
    const { listener, prisma } = build();
    await listener.onVoteChanged({ ...base, entityType: 'POST', previous: 'UP', next: null });
    expect(prisma.post.update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { voteScore: { increment: -1 } } });
  });
});
