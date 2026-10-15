import { isUserBanned } from './user-ban';

function prismaWithLast(action: 'BAN' | 'RESTORED' | null) {
  const findFirst = jest.fn().mockResolvedValue(action ? { action } : null);
  return { prisma: { moderationAction: { findFirst } } as never, findFirst };
}

describe('isUserBanned', () => {
  it('vaut vrai quand la dernière action sur le compte est un BAN', async () => {
    const { prisma } = prismaWithLast('BAN');
    expect(await isUserBanned(prisma, 'u1')).toBe(true);
  });

  it('vaut faux quand la dernière action est une levée de ban', async () => {
    const { prisma } = prismaWithLast('RESTORED');
    expect(await isUserBanned(prisma, 'u1')).toBe(false);
  });

  it('vaut faux quand le compte n\'a jamais été modéré', async () => {
    const { prisma } = prismaWithLast(null);
    expect(await isUserBanned(prisma, 'u1')).toBe(false);
  });

  it('ne regarde que les actions USER de ce compte, la plus récente en premier', async () => {
    const { prisma, findFirst } = prismaWithLast('BAN');
    await isUserBanned(prisma, 'u1');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where:   expect.objectContaining({ entityType: 'USER', entityId: 'u1' }),
      orderBy: { createdAt: 'desc' },
    }));
  });
});
