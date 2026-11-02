// Adresse du profil public d'un membre. Un compte administrateur n'en a pas : l'API répond 404,
// et l'interface n'affiche alors qu'un nom, jamais un lien mort.

/** `/@pseudo`, ou null pour un compte qui n'a pas de profil public. */
export function profilePath(user: { username: string; role?: string | null } | null | undefined): string | null {
  return user && user.role !== 'ADMIN' ? `/@${user.username}` : null;
}

export function hasPublicProfile(user: { role?: string | null } | null | undefined): boolean {
  return !!user && user.role !== 'ADMIN';
}
