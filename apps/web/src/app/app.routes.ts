import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.Home),
    title: 'AfriDev Hub',
  },
  {
    path: 'forum',
    loadChildren: () => import('./features/forum/forum.routes').then((m) => m.FORUM_ROUTES),
  },
  {
    path: 'projets',
    loadChildren: () => import('./features/projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects.routes').then((m) => m.PROJECTS_ROUTES),
  },
  {
    path: 'mentorat',
    loadComponent: () => import('./features/mentorat/mentor-list/mentor-list.component').then((m) => m.MentorListComponent),
  },
  {
    path: 'communautes',
    loadComponent: () => import('./features/communities/communautes').then((m) => m.Communautes),
  },
  {
    path: 'jobs',
    loadChildren: () => import('./features/jobs/jobs.routes').then((m) => m.JOBS_ROUTES),
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () =>
      import('./features/authentification/authentification.routes').then((m) => m.AUTHENTIFICATION_ROUTES),
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
  },
  {
    path: '@:username',
    loadComponent: () =>
      import('./features/profile/public-profile/public-profile.component').then(
        (m) => m.PublicProfileComponent,
      ),
    title: 'Profil — AfriDev Hub',
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(
        (m) => m.NotificationsComponent
      ),
    title: 'Notifications — AfriDev Hub',
  },
  {
    path: 'leaderboard',
    loadComponent: () => import('./features/gamification/leaderboard/leaderboard.component').then((m) => m.LeaderboardComponent),
    title: 'Classement — AfriDev Hub',
  },
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
    title: 'Page introuvable — AfriDev Hub',
  },
];
