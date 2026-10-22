import { GithubService } from './github.service';

describe('GithubService', () => {
  const service = new GithubService({ get: () => undefined } as never);

  it.each([
    ['https://github.com/TheShvdow/afridev_hub', 'theshvdow/afridev_hub'],
    ['https://github.com/nestjs/nest.git', 'nestjs/nest'],
    ['http://www.github.com/angular/angular/', 'angular/angular'],
  ])('reads %s as %s', (url, expected) => {
    expect(service.parseRepoUrl(url)).toBe(expected);
  });

  it.each([
    'https://gitlab.com/org/repo',
    'https://github.com/only-owner',
    'https://github.com/org/repo/tree/main',
    'https://evil.com/github.com/org/repo',
  ])('rejects %s', (url) => {
    expect(service.parseRepoUrl(url)).toBeNull();
  });

  it('maps the GitHub response to repository stats', async () => {
    const spy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      full_name: 'nestjs/nest', stargazers_count: 70000, forks_count: 7000, language: 'TypeScript', pushed_at: '2026-10-20T10:00:00Z',
    }), { status: 200 }));
    await expect(service.fetchRepo('nestjs/nest')).resolves.toEqual({
      status: 'ok',
      repo: { fullName: 'nestjs/nest', stars: 70000, forks: 7000, language: 'TypeScript', pushedAt: new Date('2026-10-20T10:00:00Z') },
    });
    spy.mockRestore();
  });

  it('separates a missing repository from an unavailable API', async () => {
    const spy = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 403 }));
    await expect(service.fetchRepo('a/b')).resolves.toEqual({ status: 'not_found' });
    await expect(service.fetchRepo('a/b')).resolves.toMatchObject({ status: 'unavailable' });
    spy.mockRestore();
  });
});
