import { ForumService } from './forum.service';

describe('ForumService.createAnswer — règle du glossaire', () => {
  function build(postAuthor: string) {
    const prisma = {
      post: { findUnique: jest.fn().mockResolvedValue({ id: 'p1', userId: postAuthor }) },
      answer: { create: jest.fn().mockResolvedValue({ id: 'a1', body: 'x', user: {} }) },
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

  it('accepts an answer from another member and emits forum.answer.created', async () => {
    const { service, events } = build('author');
    await service.createAnswer('p1', 'other', dto as never);
    expect(events.emit).toHaveBeenCalledWith('forum.answer.created', expect.objectContaining({ authorId: 'other', postId: 'p1' }));
  });
});
