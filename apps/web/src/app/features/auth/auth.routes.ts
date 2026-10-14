import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
    title: 'Connexion — AfriDev Hub',
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.component').then((m) => m.RegisterComponent),
    title: 'Inscription — AfriDev Hub',
  },
  {
    path: 'github/callback',
    loadComponent: () =>
      import('./oauth-callback/oauth-callback.component').then(
        (m) => m.OauthCallbackComponent
      ),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
