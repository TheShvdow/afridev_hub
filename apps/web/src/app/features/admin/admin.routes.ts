import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { roleGuard } from '../../core/guards/role.guard';

// L'API réserve /admin/* aux ADMIN ; signalements (/moderation/*) et offres à valider (/jobs/review)
// restent ouverts aux modérateurs.
const ADMIN_ONLY = { canActivate: [roleGuard], data: { roles: ['ADMIN'] } };

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      // Les administrateurs arrivent sur le tableau de bord, les modérateurs sur les signalements.
      {
        path: '',
        pathMatch: 'full',
        redirectTo: () => (inject(AuthStore).currentUser()?.role === 'ADMIN' ? 'dashboard' : 'reports'),
      },
      {
        path: 'dashboard',
        ...ADMIN_ONLY,
        loadComponent: () =>
          import('./dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
        title: 'Tableau de bord — Admin',
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./reports/reports.component').then((m) => m.ReportsComponent),
        title: 'Signalements — Admin',
      },
      {
        path: 'users',
        ...ADMIN_ONLY,
        loadComponent: () =>
          import('./users/admin-users.component').then(
            (m) => m.AdminUsersComponent
          ),
        title: 'Utilisateurs — Admin',
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./jobs/admin-jobs.component').then(
            (m) => m.AdminJobsComponent
          ),
        title: 'Offres à valider — Admin',
      },
      {
        path: 'audit',
        ...ADMIN_ONLY,
        loadComponent: () =>
          import('./audit/audit-log.component').then(
            (m) => m.AuditLogComponent
          ),
        title: 'Journal d\'audit — Admin',
      },
    ],
  },
];
