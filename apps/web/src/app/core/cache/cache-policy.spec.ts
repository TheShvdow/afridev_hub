import { FRESH_MS, STALE_MS, apiPath, freshnessOf, isCacheableRead, writeInvalidatesCache } from './cache-policy';

const API = 'http://localhost:3000/api';
const ID = '3f2b8c1e-9d4a-4b7e-8a11-123456789abc';

describe('cache policy', () => {
  it('extracts the path below the API url, and ignores other servers', () => {
    expect(apiPath(`${API}/forum/posts?page=2`, API)).toBe('/forum/posts');
    expect(apiPath('https://pay.test.bictorys.com/checkout', API)).toBeNull();
  });

  it.each([
    '/forum/posts',
    `/forum/posts/${ID}`,
    '/projects',
    '/projects/mon-projet',
    '/jobs',
    `/jobs/${ID}`,
    '/users/aminata_dev',
    '/users/aminata_dev/badges',
    '/countries',
  ])('caches the read %s', (path) => {
    expect(isCacheableRead('GET', path)).toBe(true);
  });

  it.each([
    '/jobs/plan',
    '/jobs/mine',
    '/jobs/alerts',
    '/jobs/review',
    `/jobs/${ID}/applications`,
    '/users/me',
    '/forum/posts/similar',
    '/notifications',
    '/notifications/unread-count',
    `/payments/${ID}`,
    '/admin/stats',
    '/moderation/reports',
    '/auth/me',
  ])('never caches %s', (path) => {
    expect(isCacheableRead('GET', path)).toBe(false);
  });

  it('never caches a write', () => {
    expect(isCacheableRead('POST', '/forum/posts')).toBe(false);
  });

  it('clears the cache on a write, except those that change no cached read', () => {
    expect(writeInvalidatesCache('POST', '/forum/posts')).toBe(true);
    expect(writeInvalidatesCache('POST', '/votes/answers/1')).toBe(true);
    expect(writeInvalidatesCache('POST', '/auth/login')).toBe(true);
    expect(writeInvalidatesCache('PATCH', `/jobs/${ID}/approve`)).toBe(true);
    expect(writeInvalidatesCache('POST', '/auth/refresh')).toBe(false);
    expect(writeInvalidatesCache('PATCH', '/notifications/read-all')).toBe(false);
    expect(writeInvalidatesCache('POST', '/upload/cv-presign')).toBe(false);
    expect(writeInvalidatesCache('GET', '/forum/posts')).toBe(false);
  });

  it('tells fresh, stale and expired entries apart', () => {
    expect(freshnessOf(0, FRESH_MS - 1)).toBe('fresh');
    expect(freshnessOf(0, FRESH_MS)).toBe('stale');
    expect(freshnessOf(0, STALE_MS)).toBe('expired');
  });
});
