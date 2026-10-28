// Règles du cache des lectures : ce qu'on garde, combien de temps, et ce qui le vide.

/** Réponse servie sans appel réseau. */
export const FRESH_MS = 30_000;
/** Au-delà de FRESH_MS et jusqu'ici : réponse servie tout de suite, puis relue en arrière-plan. */
export const STALE_MS = 10 * 60_000;

// Lectures publiques ou propres au membre connecté (la clé du cache contient son identifiant).
// Liste blanche : tout ce qui est volatil ou privé (plan, offres du recruteur, candidatures,
// notifications, statut d'un paiement, administration, modération) n'y figure pas.
const CACHEABLE_PATHS: RegExp[] = [
  /^\/forum\/posts(\/(?!similar$)[^/]+)?$/,
  /^\/projects(\/[^/]+)?$/,
  /^\/jobs(\/(?!plan$|mine$|alerts$|review$)[^/]+)?$/,
  /^\/users\/(?!me$)[^/]+(\/activity|\/badges)?$/,
  /^\/countries$/,
];

// Écritures qui ne changent aucune lecture gardée : elles ne vident pas le cache.
const HARMLESS_WRITES: RegExp[] = [/^\/auth\/refresh$/, /^\/notifications(\/|$)/, /^\/upload\//];

/** Chemin de la requête sous l'URL de l'API (`/forum/posts`), ou null si elle vise un autre serveur. */
export function apiPath(url: string, apiUrl: string): string | null {
  try {
    const target = new URL(url, 'https://local.invalid');
    const base = new URL(apiUrl, 'https://local.invalid');
    if (target.origin !== base.origin || !target.pathname.startsWith(base.pathname)) return null;
    return target.pathname.slice(base.pathname.replace(/\/$/, '').length) || '/';
  } catch {
    return null;
  }
}

export function isCacheableRead(method: string, path: string | null): boolean {
  return method === 'GET' && path !== null && CACHEABLE_PATHS.some((rule) => rule.test(path));
}

/** Une écriture réussie vide tout le cache, sauf celles qui ne touchent à aucune lecture gardée. */
export function writeInvalidatesCache(method: string, path: string | null): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return path !== null && !HARMLESS_WRITES.some((rule) => rule.test(path));
}

export type Freshness = 'fresh' | 'stale' | 'expired';

export function freshnessOf(storedAt: number, now: number): Freshness {
  const age = now - storedAt;
  if (age < FRESH_MS) return 'fresh';
  return age < STALE_MS ? 'stale' : 'expired';
}
