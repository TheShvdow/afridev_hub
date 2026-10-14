import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const appRoutes: Routes = [
  // Redirect racine
  {
    path: '',
    redirectTo: '/forum',
    pathMatch: 'full',
  },

  // ── Auth ─────────────────────────────────────────────────────────
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
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
