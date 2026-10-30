/**
 * Lit la charge utile d'un JWT sans vérifier la signature : uniquement pour
 * récupérer une information d'affichage (l'email), jamais pour authentifier.
 */
export function decodeJwtPayload<T extends Record<string, unknown>>(token: string): T | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const base64 = segment.replaceAll('-', '+').replaceAll('_', '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(char.codePointAt(0) ?? 0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
