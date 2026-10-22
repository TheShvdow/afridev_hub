import { HttpContextToken } from '@angular/common/http';

/**
 * Marque une requête dont l'échec ne doit pas être signalé par un toast
 * global : l'appelant gère lui-même l'erreur (erreur attendue, appel
 * best-effort dont l'échec n'a pas d'impact sur le parcours).
 */
export const SILENT_ERROR = new HttpContextToken<boolean>(() => false);
