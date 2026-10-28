import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../store/auth.store';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  const decide = (role: string | undefined) => (role && requiredRoles.includes(role) ? true : router.createUrlTree(['/forum']));

  const user = authStore.currentUser();
  if (user || !authStore.accessToken()) return decide(user?.role);

  // Page ouverte directement ou rechargée : les jetons sont là mais le profil n'est pas encore chargé.
  // On l'attend plutôt que de conclure à l'absence de rôle et de renvoyer un administrateur vers le forum.
  return authService.getMe().pipe(
    tap((me) => authStore.setUser(me)),
    map((me) => decide(me.role)),
    catchError(() => of(router.createUrlTree(['/forum']))),
  );
};

/**
 * Page d'arrivée de `/admin` : le tableau de bord pour un administrateur, les signalements pour un modérateur.
 * Attend le profil comme `roleGuard`, car le rôle n'est pas connu à l'ouverture directe de la page.
 */
export const adminHomeGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const home = (role: string | undefined) => router.createUrlTree([role === 'ADMIN' ? '/admin/dashboard' : '/admin/reports']);

  const user = authStore.currentUser();
  if (user || !authStore.accessToken()) return home(user?.role);

  return authService.getMe().pipe(
    tap((me) => authStore.setUser(me)),
    map((me) => home(me.role)),
    catchError(() => of(router.createUrlTree(['/forum']))),
  );
};

