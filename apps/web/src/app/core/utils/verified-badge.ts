/** Longueur minimale de la bio pour le badge « dev vérifié » (glossaire BMAD, `MIN_BIO_LENGTH` côté API). */
export const MIN_BIO_FOR_BADGE = 50;

export interface BadgeCandidate {
  isVerified: boolean;
  country: string | null;
  stack: string[];
  bio: string | null;
  githubUsername: string | null;
  linkedinUsername: string | null;
  twitterUsername: string | null;
  websiteUrl: string | null;
}

export interface BadgeCriterion {
  key: 'email' | 'country' | 'stack' | 'bio' | 'link';
  label: string;
  met: boolean;
}

const filled = (value: string | null | undefined): boolean => Boolean(value?.trim());

/**
 * Les cinq conditions du badge « dev vérifié », identiques à `isVerifiedProfile` de l'API :
 * email confirmé, pays, stack, bio d'au moins 50 caractères et un lien externe.
 * Ce badge est exigé pour soumettre un projet dans la vitrine.
 */
export function verifiedBadgeCriteria(profile: BadgeCandidate): BadgeCriterion[] {
  const hasLink = [
    profile.githubUsername,
    profile.linkedinUsername,
    profile.twitterUsername,
    profile.websiteUrl,
  ].some(filled);

  return [
    { key: 'email', label: 'Adresse e-mail confirmée', met: profile.isVerified },
    { key: 'country', label: 'Pays renseigné', met: filled(profile.country) },
    { key: 'stack', label: 'Au moins une technologie dans votre stack', met: profile.stack.length > 0 },
    {
      key: 'bio',
      label: `Biographie d'au moins ${MIN_BIO_FOR_BADGE} caractères`,
      met: (profile.bio?.trim().length ?? 0) >= MIN_BIO_FOR_BADGE,
    },
    { key: 'link', label: 'Un lien externe (site, GitHub, LinkedIn ou X)', met: hasLink },
  ];
}
