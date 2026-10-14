import { UsersService } from './users.service';

describe('UsersService — métadonnées Open Graph (story E2-9)', () => {
  function build(user: Record<string, unknown>) {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const config = { get: jest.fn((key: string, d?: string) => (key === 'WEB_URL' ? 'https://web.test' : d)) };
    return new UsersService(prisma as never, { emit: jest.fn() } as never, config as never);
  }
  const base = { id: 'u1', username: 'amadou', displayName: 'Amadou Fall', bio: null, avatarUrl: 'https://cdn.test/a.png' };

  it('builds title, description, image and canonical url', async () => {
    const og = (await build(base).findByUsername('amadou') as { ogMeta: Record<string, unknown> }).ogMeta;
    expect(og).toEqual({
      ogTitle: 'Amadou Fall — AfriDev Hub',
      ogDescription: 'Profil de Amadou Fall sur AfriDev Hub',
      ogImage: 'https://cdn.test/a.png',
      ogUrl: 'https://web.test/@amadou',
    });
  });

  it('uses the bio as description and truncates it to 160 characters', async () => {
    const og = (await build({ ...base, bio: 'b'.repeat(300) }).findByUsername('amadou') as { ogMeta: Record<string, string> }).ogMeta;
    expect(og.ogDescription).toHaveLength(160);
  });

  it('falls back to the username when there is no display name', async () => {
    const og = (await build({ ...base, displayName: null }).findByUsername('amadou') as { ogMeta: Record<string, string> }).ogMeta;
    expect(og.ogTitle).toBe('amadou — AfriDev Hub');
  });
});
