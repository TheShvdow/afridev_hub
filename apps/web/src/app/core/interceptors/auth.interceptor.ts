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
      // 401 → tenter un refresh silencieux
      if (error.status === 401 && !req.url.includes('/auth/') && !isRefreshing) {
        isRefreshing = true;

        return authService.refreshToken().pipe(
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
      }

      return throwError(() => error);
    })
  );
};
