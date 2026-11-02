import { UsersService } from './users.service';

// Un compte administrateur n'a pas de profil public : il est introuvable, comme un compte inexistant.
describe('UsersService — pas de profil public pour un administrateur', () => {
  function build(user: Record<string, unknown> | null) {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) }, post: { findMany: jest.fn() }, userBadge: { findMany: jest.fn() } };
    const config = { get: jest.fn((_k: string, d?: string) => d) };
    return new UsersService(prisma as never, { emit: jest.fn() } as never, config as never);
  }
  const member = { id: 'u1', username: 'aminata', displayName: null, bio: null, avatarUrl: null, role: 'MEMBER' };
  const admin = { ...member, id: 'a1', username: 'awa_admin', role: 'ADMIN' };

  it('serves the profile of a member', async () => {
    await expect(build(member).findByUsername('aminata')).resolves.toMatchObject({ username: 'aminata' });
  });

  it.each([
    ['profile', (s: UsersService) => s.findByUsername('awa_admin')],
    ['activity', (s: UsersService) => s.getActivity('awa_admin')],
    ['badges', (s: UsersService) => s.getBadges('awa_admin')],
  ])('answers 404 for the %s of an administrator', async (_name, call) => {
    await expect(call(build(admin))).rejects.toMatchObject({ status: 404, code: 'USERS_USER_NOT_FOUND' });
  });

  it('keeps the moderator profile public', async () => {
    await expect(build({ ...member, role: 'MODERATOR' }).findByUsername('aminata')).resolves.toBeDefined();
  });
});
