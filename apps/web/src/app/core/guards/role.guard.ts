import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthStore } from '../store/auth.store';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as string[];
  const userRole = authStore.currentUser()?.role;

  if (userRole && requiredRoles.includes(userRole)) {
    return true;
  }

  return router.createUrlTree(['/forum']);
};
