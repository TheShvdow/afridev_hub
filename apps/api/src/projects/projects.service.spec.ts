import { ProjectsService } from './projects.service';

const repo = { fullName: 'acme/afripay', stars: 42, forks: 7, language: 'TypeScript', pushedAt: new Date('2026-10-20') };

function build(opts: {
  project?: Record<string, unknown> | null;
  badge?: unknown;
  duplicate?: unknown;
  github?: unknown;
} = {}) {
  const tx = {
    project:    { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data })), update: jest.fn().mockResolvedValue({ id: 'p1' }) },
    projectTag: { findMany: jest.fn().mockResolvedValue([]), deleteMany: jest.fn(), createMany: jest.fn() },
    tag:        { createMany: jest.fn(), findMany: jest.fn().mockResolvedValue([{ id: 't1' }]), updateMany: jest.fn() },
  };
  const prisma = {
    project: {
      findUnique:        jest.fn().mockResolvedValue(opts.project ?? null),
      findFirst:         jest.fn().mockResolvedValue(opts.duplicate ?? null),
      findMany:          jest.fn().mockResolvedValue([]),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'p1' }),
      count:             jest.fn().mockResolvedValue(0),
      update:            jest.fn().mockResolvedValue({ id: 'p1' }),
      delete:            jest.fn().mockResolvedValue({}),
    },
    projectCategory: { findUnique: jest.fn().mockResolvedValue({ id: 'c1' }) },
    userBadge:       { findFirst: jest.fn().mockResolvedValue(opts.badge === undefined ? { id: 'b1' } : opts.badge) },
    projectStar:     { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn(), delete: jest.fn(), count: jest.fn().mockResolvedValue(1) },
    $transaction:    jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const github = {
    parseRepoUrl: jest.fn((url: string) => (url.startsWith('https://github.com/') ? url.slice(19).toLowerCase() : null)),
    fetchRepo:    jest.fn().mockResolvedValue(opts.github ?? { status: 'ok', repo }),
  };
  const config = { get: jest.fn().mockReturnValue('https://afridevhub.com') };
  const service = new ProjectsService(prisma as never, github as never, config as never);
  return { service, prisma, tx, github };
}

const dto = {
  name: 'AfriPay Paiements', description: 'x'.repeat(60), country: 'SN', repoUrl: 'https://github.com/Acme/AfriPay',
  tags: ['nestjs'], categorySlug: 'fintech',
};

describe('ProjectsService — soumission (FR-22, FR-23, FR-27)', () => {
  it('requires the verified developer badge', async () => {
    const { service } = build({ badge: null });
    await expect(service.create('u1', dto as never)).rejects.toMatchObject({ code: 'PROJECTS_VERIFIED_BADGE_REQUIRED', status: 403 });
  });

  it('rejects a link that is not a GitHub repository', async () => {
    const { service } = build();
    await expect(service.create('u1', { ...dto, repoUrl: 'https://gitlab.com/a/b' } as never))
      .rejects.toMatchObject({ code: 'PROJECTS_GITHUB_URL_INVALID' });
  });

  it('rejects a repository GitHub does not know', async () => {
    const { service } = build({ github: { status: 'not_found' } });
    await expect(service.create('u1', dto as never)).rejects.toMatchObject({ code: 'PROJECTS_GITHUB_REPO_NOT_FOUND', status: 422 });
  });

  it('rejects a repository already in the showcase', async () => {
    const { service } = build({ duplicate: { id: 'other' } });
    await expect(service.create('u1', dto as never)).rejects.toMatchObject({ code: 'PROJECTS_REPO_ALREADY_SUBMITTED', status: 409 });
  });

  it('publishes with a slug and the imported GitHub stats', async () => {
    const { service, tx } = build();
    const result = await service.create('u1', dto as never);
    expect(tx.project.create.mock.calls[0][0].data).toMatchObject({
      slug: 'afripay-paiements', githubFullName: 'acme/afripay', githubStars: 42, githubForks: 7, githubLanguage: 'TypeScript',
    });
    expect(result.githubImport).toBe('imported');
  });

  it('still publishes when GitHub is unavailable, without stats', async () => {
    const { service, tx } = build({ github: { status: 'unavailable', reason: 'rate limit' } });
    const result = await service.create('u1', dto as never);
    expect(tx.project.create.mock.calls[0][0].data).not.toHaveProperty('githubSyncedAt');
    expect(result.githubImport).toBe('unavailable');
  });
});

describe('ProjectsService — page publique (FR-24)', () => {
  const stored = {
    id: '11111111-1111-4111-8111-111111111111', slug: 'afripay', name: 'AfriPay', description: 'Paiements  mobiles\nunifiés',
    userId: 'owner', isHidden: false, githubFullName: 'acme/afripay', user: { avatarUrl: null },
  };

  it('finds a project by slug and builds its Open Graph metadata', async () => {
    const { service, prisma } = build({ project: stored });
    const result = await service.findOne('afripay', null);
    expect(prisma.project.findUnique.mock.calls[0][0].where).toEqual({ slug: 'afripay' });
    expect(result.ogMeta).toEqual({
      ogTitle: 'AfriPay — AfriDev Hub',
      ogDescription: 'Paiements mobiles unifiés',
      ogImage: 'https://opengraph.githubassets.com/1/acme/afripay',
      ogUrl: 'https://afridevhub.com/projects/afripay',
    });
  });

  it('still accepts an old link by identifier', async () => {
    const { service, prisma } = build({ project: stored });
    await service.findOne(stored.id, null);
    expect(prisma.project.findUnique.mock.calls[0][0].where).toEqual({ id: stored.id });
  });

  it('hides a project masked by moderation, except from its author', async () => {
    const { service } = build({ project: { ...stored, isHidden: true } });
    await expect(service.findOne('afripay', null)).rejects.toMatchObject({ code: 'PROJECTS_PROJECT_NOT_FOUND' });
    await expect(service.findOne('afripay', { id: 'owner', role: 'MEMBER' })).resolves.toMatchObject({ starredByViewer: false });
  });
});

describe('ProjectsService — vitrine (FR-26)', () => {
  it('combines category, stack and country filters and sorts by AfriDev stars', async () => {
    const { service, prisma } = build();
    await service.list({ category: 'fintech', stack: ['nestjs', 'angular'], country: 'SN', sort: 'popular' } as never);
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isHidden: false,
        category: { slug: 'fintech' },
        country: 'SN',
        projectTags: { some: { tag: { slug: { in: ['nestjs', 'angular'] } } } },
      },
      orderBy: [{ stars: { _count: 'desc' } }, { createdAt: 'desc' }],
    }));
  });
});

describe('ProjectsService — stats GitHub', () => {
  const project = { id: 'p1', userId: 'owner', githubFullName: 'acme/afripay', githubSyncedAt: null };

  it('lets the author refresh, but not twice within an hour', async () => {
    const { service, prisma } = build({ project });
    await expect(service.refreshStats('p1', { id: 'owner', role: 'MEMBER' })).resolves.toMatchObject({ githubImport: 'imported' });
    expect(prisma.project.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ githubStars: 42 }) }));

    prisma.project.findUnique.mockResolvedValue({ ...project, githubSyncedAt: new Date() });
    await expect(service.refreshStats('p1', { id: 'owner', role: 'MEMBER' })).rejects.toMatchObject({ code: 'PROJECTS_REFRESH_TOO_SOON', status: 429 });
  });

  it('refuses a refresh from another member', async () => {
    const { service } = build({ project });
    await expect(service.refreshStats('p1', { id: 'intrus', role: 'MEMBER' })).rejects.toMatchObject({ code: 'PROJECTS_FORBIDDEN' });
  });

  it('stops the nightly refresh at the GitHub rate limit', async () => {
    const { service, prisma, github } = build();
    prisma.project.findMany.mockResolvedValue([project, { ...project, id: 'p2' }, { ...project, id: 'p3' }]);
    github.fetchRepo
      .mockResolvedValueOnce({ status: 'ok', repo })
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'rate limit' });
    await expect(service.refreshAllStats()).resolves.toBe(1);
    expect(github.fetchRepo).toHaveBeenCalledTimes(2);
  });
});

describe('ProjectsService — modification et suppression', () => {
  const project = { id: 'p1', userId: 'owner', repoUrl: 'https://github.com/acme/afripay' };

  it('lets the author update fields without checking GitHub again', async () => {
    const { service, tx, github } = build({ project });
    await service.update('p1', 'owner', { country: 'CI' } as never);
    expect(tx.project.update.mock.calls[0][0].data).toEqual({ country: 'CI' });
    expect(github.fetchRepo).not.toHaveBeenCalled();
  });

  it('checks a new repository and replaces the stats', async () => {
    const { service, tx, github } = build({ project });
    await service.update('p1', 'owner', { repoUrl: 'https://github.com/acme/afripay-v2' } as never);
    expect(github.fetchRepo).toHaveBeenCalledWith('acme/afripay-v2');
    expect(tx.project.update.mock.calls[0][0].data).toMatchObject({ githubFullName: 'acme/afripay-v2', githubStars: 42 });
  });

  it('refuses an update from another member', async () => {
    const { service, tx } = build({ project });
    await expect(service.update('p1', 'intrus', { name: 'x' } as never)).rejects.toMatchObject({ code: 'PROJECTS_FORBIDDEN' });
    expect(tx.project.update).not.toHaveBeenCalled();
  });

  it('lets the author delete their project', async () => {
    const { service, prisma } = build({ project });
    await service.delete('p1', 'owner', 'MEMBER');
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('toggles a star and returns the new count', async () => {
    const { service } = build({ project: { ...project, isHidden: false } });
    await expect(service.star('p1', 'fan')).resolves.toEqual({ starred: true, stars: 1 });
  });
});
