import { corsOrigins } from './cors';

describe('corsOrigins', () => {
  it('falls back to the local front when nothing is configured', () => {
    expect(corsOrigins({})).toEqual(['http://localhost:4200']);
  });

  it('keeps WEB_URL alone when CORS_ORIGINS is not set', () => {
    expect(corsOrigins({ WEB_URL: 'https://afridevhub.com' })).toEqual(['https://afridevhub.com']);
  });

  it('adds the extra origins, trimmed, without trailing slash or duplicates', () => {
    const origins = corsOrigins({
      WEB_URL: 'https://afridevhub.com/',
      CORS_ORIGINS: ' https://afridev-hub-web.vercel.app/ , https://afridevhub.com,, http://localhost:4200 ',
    });

    expect(origins).toEqual(['https://afridevhub.com', 'https://afridev-hub-web.vercel.app', 'http://localhost:4200']);
  });
});
