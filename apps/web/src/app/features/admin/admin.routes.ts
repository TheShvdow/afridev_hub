import { Routes } from '@angular/router';

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
        loadComponent: () =>
          import('./users/admin-users.component').then(
            (m) => m.AdminUsersComponent
          ),
        title: 'Utilisateurs — Admin',
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./projects/admin-projects.component').then(
            (m) => m.AdminProjectsComponent
          ),
        title: 'Projets à approuver — Admin',
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./jobs/admin-jobs.component').then(
            (m) => m.AdminJobsComponent
          ),
        title: 'Offres d\'emploi — Admin',
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./audit/audit-log.component').then(
            (m) => m.AuditLogComponent
          ),
        title: 'Journal d\'audit — Admin',
      },
    ],
  },
];
