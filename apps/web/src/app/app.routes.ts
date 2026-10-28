import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const appRoutes: Routes = [
  // ── Landing / vitrine ────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
    title: 'AfriDev Hub',
  },
  {
    path: 'projets',
    loadComponent: () =>
      import('./features/projects/project-list/projets').then((m) => m.Projets),
    title: 'Projets — AfriDev Hub',
  },
  {
    path: 'communautes',
    loadComponent: () =>
      import('./features/communities/communautes').then((m) => m.Communautes),
    title: 'Communautés — AfriDev Hub',
  },
  {
    path: 'mentorat',
    loadComponent: () =>
      import('./features/mentorat/mentor-list/mentor-list.component').then(
        (m) => m.MentorListComponent,
      ),
    title: 'Mentorat — AfriDev Hub',
  },

  // ── Auth ─────────────────────────────────────────────────────────
  // L'implémentation vit dans `features/authentification` (design connexion,
  // inscription et vérification d'e-mail). L'URL reste `/auth` : l'API y
  // redirige les callbacks OAuth.
  // `noAuthGuard` est posé sur les pages login/register, pas sur le parent :
  // la page de vérification d'email doit rester accessible à un utilisateur
  // déjà connecté (il vient de s'inscrire et l'API l'a déjà authentifié).
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/authentification/authentification.routes').then(
        (m) => m.AUTHENTIFICATION_ROUTES
      ),
  },

  // ── Forum Q&A ────────────────────────────────────────────────────
  {
    path: 'forum',
    loadChildren: () =>
      import('./features/forum/forum.routes').then((m) => m.FORUM_ROUTES),
  },

  // ── Vitrine Projets ───────────────────────────────────────────────
  {
    path: 'projects',
    loadChildren: () =>
      import('./features/projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
  },

  // ── Job Board ─────────────────────────────────────────────────────
  {
    path: 'jobs',
    loadChildren: () =>
      import('./features/jobs/jobs.routes').then((m) => m.JOBS_ROUTES),
  },

  // ── Retour de paiement Bictorys ───────────────────────────────────
  {
    path: 'payment/result',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/payment/payment-result.component').then((m) => m.PaymentResultComponent),
    title: 'Paiement — AfriDev Hub',
  },

  // ── Profil utilisateur ────────────────────────────────────────────
  {
    path: 'profile',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
  },

  // ── Notifications ─────────────────────────────────────────────────
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent
      ),
  },

  // ── Administration ────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['MODERATOR', 'ADMIN'] },
    loadChildren: () =>
      import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // ── Utilisateur public ────────────────────────────────────────────
  {
    path: 'u/:username',
    loadComponent: () =>
      import('./features/profile/public-profile/public-profile.component').then(
        (m) => m.PublicProfileComponent
      ),
  },

  // ── 404 ──────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(
        (m) => m.NotFoundComponent
      ),
  },
];
