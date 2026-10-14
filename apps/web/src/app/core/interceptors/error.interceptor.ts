import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ne pas afficher de toast sur les 401 (géré par authInterceptor)
      if (error.status === 401) {
        return throwError(() => error);
      }

      const message =
        error.error?.message ||
        error.error?.error ||
        getDefaultMessage(error.status);

      toast.error(message);

      return throwError(() => error);
    })
  );
};

function getDefaultMessage(status: number): string {
  switch (status) {
    case 400: return 'Requête invalide.';
    case 403: return 'Accès refusé.';
    case 404: return 'Ressource introuvable.';
    case 409: return 'Conflit : cette ressource existe déjà.';
    case 422: return 'Données invalides.';
    case 429: return 'Trop de requêtes. Réessayez dans un instant.';
    case 500: return 'Erreur serveur. Réessayez plus tard.';
    default:  return 'Une erreur est survenue.';
  }
}
