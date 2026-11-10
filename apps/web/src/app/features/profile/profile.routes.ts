import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings/settings.component').then((m) => m.SettingsComponent),
    title: 'Mon profil — AfriDev Hub',
    children: [
      { path: '', redirectTo: 'account', pathMatch: 'full' },
      {
        path: 'account',
        loadComponent: () =>
          import('./settings/account/account.component').then(
            (m) => m.AccountComponent
          ),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./settings/security/security.component').then(
            (m) => m.SecurityComponent
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./settings/notification-prefs/notification-prefs.component').then(
            (m) => m.NotificationPrefsComponent
          ),
      },
    ],
  },
  {
    path: 'recruiter',
    loadComponent: () => import('./recruiter/recruiter.component').then((m) => m.RecruiterComponent),
    title: 'Devenir recruteur — AfriDev Hub',
  },
];
