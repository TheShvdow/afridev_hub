import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../store/auth.store';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authStore.accessToken();

  // Ajouter le token sur toutes les requêtes API
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 → tenter un refresh silencieux.
      // Les routes /auth/* sont exclues : leur 401 est une réponse métier
      // (identifiants incorrects) et non un token expiré.
      if (error.status !== 401 || req.url.includes('/auth/') || isRefreshing) {
        return throwError(() => error);
      }

      const refreshToken = authStore.refreshToken();
      if (!refreshToken) {
        // Plus de session renouvelable : on renvoie vers la connexion.
        authStore.logout();
        router.navigate(['/auth/login']);
        return throwError(() => error);
      }

      isRefreshing = true;

      return authService.refreshToken(refreshToken).pipe(
        switchMap((tokens) => {
          isRefreshing = false;
          authStore.setTokens(tokens.accessToken, tokens.refreshToken);

          return next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
            })
          );
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          authStore.logout();
          router.navigate(['/auth/login']);
          return throwError(() => refreshError);
        })
      );
    })
  );
};
