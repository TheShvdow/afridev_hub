import { InjectionToken } from '@angular/core';

/**
 * Vrai quand une page s'affiche à l'intérieur du tableau de bord : la grande bannière sombre des
 * pages du site laisse alors la place à un en-tête compact.
 */
export const EMBEDDED_IN_DASHBOARD = new InjectionToken<boolean>('EMBEDDED_IN_DASHBOARD', {
  providedIn: 'root',
  factory: () => false,
});
