import { MIN_BIO_FOR_BADGE, verifiedBadgeCriteria, type BadgeCandidate } from './verified-badge';

const complete: BadgeCandidate = {
  isVerified: true,
  country: 'SN',
  stack: ['TypeScript'],
  bio: 'a'.repeat(MIN_BIO_FOR_BADGE),
  githubUsername: 'amadou',
  linkedinUsername: null,
  twitterUsername: null,
  websiteUrl: null,
};

const unmet = (profile: BadgeCandidate) =>
  verifiedBadgeCriteria(profile).filter((c) => !c.met).map((c) => c.key);

describe('verifiedBadgeCriteria', () => {
  it('remplit les cinq critères pour un profil complet', () => {
    expect(unmet(complete)).toEqual([]);
  });

  it('refuse une bio de 49 caractères et accepte 50 (même seuil que l\'API)', () => {
    expect(unmet({ ...complete, bio: 'a'.repeat(MIN_BIO_FOR_BADGE - 1) })).toEqual(['bio']);
    expect(unmet({ ...complete, bio: 'a'.repeat(MIN_BIO_FOR_BADGE) })).toEqual([]);
  });

  it('ignore les espaces autour de la bio', () => {
    expect(unmet({ ...complete, bio: `  ${'a'.repeat(MIN_BIO_FOR_BADGE - 1)}  ` })).toEqual(['bio']);
  });

  it('exige le pays, la stack et l\'email confirmé', () => {
    expect(unmet({ ...complete, country: null })).toEqual(['country']);
    expect(unmet({ ...complete, country: '  ' })).toEqual(['country']);
    expect(unmet({ ...complete, stack: [] })).toEqual(['stack']);
    expect(unmet({ ...complete, isVerified: false })).toEqual(['email']);
  });

  it('accepte n\'importe lequel des quatre liens externes', () => {
    const noLink = { ...complete, githubUsername: null };
    expect(unmet(noLink)).toEqual(['link']);
    for (const field of ['githubUsername', 'linkedinUsername', 'twitterUsername', 'websiteUrl'] as const) {
      expect(unmet({ ...noLink, [field]: 'x' })).toEqual([]);
    }
  });

  it('une bio vide compte comme non renseignée', () => {
    expect(unmet({ ...complete, bio: null })).toEqual(['bio']);
  });
});
