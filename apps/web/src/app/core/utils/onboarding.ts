import type { UserMe } from '@afridev/shared-types';

const SKIPPED_KEY = 'afridev_onboarding_skipped';

/** Profil encore vide : ni pays, ni niveau, ni technologie. */
export function needsOnboarding(user: Pick<UserMe, 'id' | 'country' | 'level' | 'stack'> & { role: string } | null): boolean {
  if (!user || user.role === 'ADMIN') return false;
  if (user.country || user.level || (user.stack?.length ?? 0) > 0) return false;
  return !wasSkipped(user.id);
}

function wasSkipped(userId: string): boolean {
  try {
    return localStorage.getItem(`${SKIPPED_KEY}:${userId}`) === '1';
  } catch {
    return false;
  }
}

export function skipOnboarding(userId: string): void {
  try {
    localStorage.setItem(`${SKIPPED_KEY}:${userId}`, '1');
  } catch {
    // Stockage indisponible : l'écran reviendra à la prochaine connexion.
  }
}
