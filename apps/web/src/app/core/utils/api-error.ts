import { HttpErrorResponse } from '@angular/common/http';

/**
 * L'API renvoie ses erreurs dans l'enveloppe AD-7 :
 * `{ error: { code, message, details } }`. Les `details` ne sont présents
 * que pour les erreurs de validation (HTTP 400).
 */
export function extractApiErrorMessage(error: unknown): string {
  const response = error as HttpErrorResponse | undefined;
  const body = response?.error as
    | {
        error?: { message?: string; details?: string[] } | string;
        message?: string | string[];
      }
    | undefined;

  // Enveloppe AD-7 : { error: { code, message, details } }
  const envelope = body?.error;
  if (envelope && typeof envelope === 'object') {
    const message = envelope.message;
    if (typeof message === 'string' && message) {
      const details = envelope.details;
      return details?.length ? `${message} ${details.join(' ')}` : message;
    }
  }

  // Format Nest par défaut : { statusCode, message: string | string[] }
  const nestMessage = body?.message;
  if (Array.isArray(nestMessage)) return nestMessage.join(' ');
  if (typeof nestMessage === 'string' && nestMessage) return nestMessage;

  if (typeof envelope === 'string' && envelope) return envelope;

  return getDefaultMessage(response?.status ?? 0);
}

/**
 * Code métier de l'erreur (`AUTH_EMAIL_NOT_VERIFIED`, `AUTH_INVALID_CREDENTIALS`…),
 * ou `null` quand l'API n'a pas renvoyé d'enveloppe AD-7.
 */
export function extractApiErrorCode(error: unknown): string | null {
  const response = error as HttpErrorResponse | undefined;
  const body = response?.error as { error?: { code?: unknown } } | undefined;
  const code = body?.error?.code;

  return typeof code === 'string' ? code : null;
}

export function getDefaultMessage(status: number): string {
  switch (status) {
    case 400: return 'Requête invalide.';
    case 401: return 'Identifiants incorrects.';
    case 403: return 'Accès refusé.';
    case 404: return 'Ressource introuvable.';
    case 409: return 'Conflit : cette ressource existe déjà.';
    case 422: return 'Données invalides.';
    case 429: return 'Trop de requêtes. Réessayez dans un instant.';
    case 500: return 'Erreur serveur. Réessayez plus tard.';
    default:  return 'Une erreur est survenue.';
  }
}
