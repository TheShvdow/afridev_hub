import { Routes } from '@angular/router';
import { noAuthGuard } from '../../core/guards/no-auth.guard';

/**
 * Parcours d'authentification.
 *
 * Le préfixe d'URL reste `/auth` : l'API y redirige les callbacks OAuth
 * (`/auth/{provider}/callback` et `/auth/oauth/link`), voir
 * `redirectAfterOAuth` dans `apps/api/src/auth/auth.controller.ts`.
 *
 * `noAuthGuard` est posé sur les pages connexion/inscription, pas sur le
 * parent : la page de vérification d'e-mail reste accessible à un utilisateur
 * déjà connecté (il vient de s'inscrire et l'API l'a déjà authentifié).
 */
export const AUTHENTIFICATION_ROUTES: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./connexion/connexion').then((m) => m.Connexion),
    title: 'Connexion — AfriDev Hub',
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./inscription/inscription').then((m) => m.Inscription),
    title: 'Inscription — AfriDev Hub',
  },
  {
    path: 'forgot-password',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./mot-de-passe-oublie/mot-de-passe-oublie').then((m) => m.MotDePasseOublie),
    title: 'Mot de passe oublié — AfriDev Hub',
  },
  {
    path: 'reset-password',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./nouveau-mot-de-passe/nouveau-mot-de-passe').then((m) => m.NouveauMotDePasse),
    title: 'Nouveau mot de passe — AfriDev Hub',
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verification-email/verification-email').then((m) => m.VerificationEmail),
    title: 'Vérification de l\'email — AfriDev Hub',
  },
  {
    path: 'github/callback',
    loadComponent: () =>
      import('./oauth-callback/oauth-callback').then((m) => m.OauthCallback),
    title: 'Connexion — AfriDev Hub',
  },
  {
    path: 'google/callback',
    loadComponent: () =>
      import('./oauth-callback/oauth-callback').then((m) => m.OauthCallback),
    title: 'Connexion — AfriDev Hub',
  },
  {
    path: 'oauth/link',
    loadComponent: () => import('./oauth-link/oauth-link').then((m) => m.OauthLink),
    title: 'Connexion — AfriDev Hub',
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
