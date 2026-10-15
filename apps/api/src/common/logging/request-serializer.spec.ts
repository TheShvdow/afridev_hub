import { serializeRequest } from './request-serializer';

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
