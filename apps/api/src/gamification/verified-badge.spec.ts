import { isVerifiedProfile, MIN_BIO_LENGTH } from './verified-badge';

const complete = {
  isVerified: true,
  country: 'SN',
  stack: ['TypeScript'],
  bio: 'x'.repeat(MIN_BIO_LENGTH),
  githubUsername: 'idrissa',
  linkedinUsername: null,
  twitterUsername: null,
  websiteUrl: null,
};

describe('isVerifiedProfile — badge dev vérifié', () => {
  it('qualifies when all five conditions hold', () => {
    expect(isVerifiedProfile(complete)).toBe(true);
  });

  it.each([
    ['email not confirmed', { isVerified: false }],
    ['no country', { country: null }],
    ['empty country', { country: '  ' }],
    ['no stack', { stack: [] }],
    ['bio too short', { bio: 'x'.repeat(MIN_BIO_LENGTH - 1) }],
    ['no bio', { bio: null }],
    ['no external link', { githubUsername: null }],
  ])('fails when %s', (_label, change) => {
    expect(isVerifiedProfile({ ...complete, ...change })).toBe(false);
  });

  it('accepts any one external link', () => {
    expect(isVerifiedProfile({ ...complete, githubUsername: null, websiteUrl: 'https://idrissawade.com' })).toBe(true);
  });
});
