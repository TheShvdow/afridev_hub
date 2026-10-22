import { Routes } from '@angular/router';
import { noAuthGuard } from '../../core/guards/no-auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Connexion — AfriDev Hub',
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
    title: 'Inscription — AfriDev Hub',
  },
  {
    // Page ouverte par le lien reçu par email (`?token=…`). Accessible même
    // connecté : l'utilisateur vient de s'inscrire et l'API l'a authentifié.
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent
      ),
    title: 'Vérification de l\'email — AfriDev Hub',
  },
  {
    path: 'github/callback',
    loadComponent: () =>
      import('./oauth-callback/oauth-callback.component').then(
        (m) => m.OauthCallbackComponent
      ),
  },
  {
    path: 'google/callback',
    loadComponent: () =>
      import('./oauth-callback/oauth-callback.component').then(
        (m) => m.OauthCallbackComponent
      ),
  },
  {
    path: 'oauth/link',
    loadComponent: () =>
      import('./oauth-link/oauth-link.component').then(
        (m) => m.OauthLinkComponent
      ),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
