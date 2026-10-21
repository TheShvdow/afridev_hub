import { serializeRequest, serializeResponse } from './request-serializer';

describe('serializeRequest', () => {
  it('retire la query string et garde la route', () => {
    const logged = serializeRequest({ method: 'POST', url: '/api/auth/verify-email?token=secret123' });
    expect(logged.url).toBe('/api/auth/verify-email');
    expect(JSON.stringify(logged)).not.toContain('secret123');
  });

  it('ne journalise pas les en-têtes', () => {
    const logged = serializeRequest({ method: 'GET', url: '/api/auth/me' }) as Record<string, unknown>;
    expect(logged).not.toHaveProperty('headers');
  });
});

describe('serializeResponse', () => {
  it('garde le code de statut et jamais les en-têtes (Location OAuth avec jetons)', () => {
    const logged = serializeResponse({
      statusCode: 302,
      headers: { location: 'https://web.test/auth/github/callback#at=secret&rt=secret' },
    } as never);
    expect(logged).toEqual({ statusCode: 302 });
    expect(JSON.stringify(logged)).not.toContain('secret');
  });
});
