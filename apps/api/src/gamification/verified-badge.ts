// Badge « dev vérifié » — glossaire : email confirmé + pays + stack + bio ≥ 50 caractères + ≥ 1 lien externe.
// Attribué quand les cinq conditions sont réunies, retiré dès qu'une seule ne l'est plus.

export const VERIFIED_BADGE_SLUG = 'dev-verifie';
export const MIN_BIO_LENGTH = 50;

export interface VerifiedCandidate {
  isVerified:      boolean;
  country:         string | null;
  stack:           string[];
  bio:             string | null;
  githubUsername:  string | null;
  linkedinUsername: string | null;
  twitterUsername: string | null;
  websiteUrl:      string | null;
}

export function isVerifiedProfile(user: VerifiedCandidate): boolean {
  const hasExternalLink = [user.githubUsername, user.linkedinUsername, user.twitterUsername, user.websiteUrl]
    .some((value) => Boolean(value?.trim()));

  return (
    user.isVerified &&
    Boolean(user.country?.trim()) &&
    user.stack.length > 0 &&
    (user.bio?.trim().length ?? 0) >= MIN_BIO_LENGTH &&
    hasExternalLink
  );
}
