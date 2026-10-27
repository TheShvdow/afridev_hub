import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';

// L'API réserve /admin/* aux ADMIN ; seuls les signalements (/moderation/*) restent ouverts aux modérateurs.
const ADMIN_ONLY = { canActivate: [roleGuard], data: { roles: ['ADMIN'] } };

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-shell/admin-shell.component').then(
        (m) => m.AdminShellComponent
      ),
    children: [
      { path: '', redirectTo: 'reports', pathMatch: 'full' },
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
        path: 'projects',
        ...ADMIN_ONLY,
        loadComponent: () =>
          import('./projects/admin-projects.component').then(
            (m) => m.AdminProjectsComponent
          ),
        title: 'Projets à approuver — Admin',
      },
      {
        path: 'jobs',
        ...ADMIN_ONLY,
        loadComponent: () =>
          import('./jobs/admin-jobs.component').then(
            (m) => m.AdminJobsComponent
          ),
        title: 'Offres d\'emploi — Admin',
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
