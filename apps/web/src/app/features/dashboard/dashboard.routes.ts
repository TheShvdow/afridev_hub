import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/role.guard';
import { EMBEDDED_IN_DASHBOARD } from '../../shared/components/page-hero/embedded.token';

const MODERATION = { canActivate: [roleGuard], data: { roles: ['MODERATOR', 'ADMIN'] } };
const ADMIN_ONLY = { canActivate: [roleGuard], data: { roles: ['ADMIN'] } };

// Les pages existantes s'affichent ici, à l'intérieur de la barre latérale. Le jeton ci-dessous leur
// fait afficher un en-tête compact à la place de la grande bannière du site.
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: EMBEDDED_IN_DASHBOARD, useValue: true }],
    loadComponent: () => import('./dashboard-shell.component').then((m) => m.DashboardShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./dashboard.component').then((m) => m.DashboardComponent),
        title: 'Tableau de bord — AfriDev Hub',
      },
      {
        path: 'notifications',
        loadComponent: () => import('../notifications/notifications.component').then((m) => m.NotificationsComponent),
        title: 'Notifications — AfriDev Hub',
      },
      {
        path: 'alertes',
        loadComponent: () => import('../jobs/job-alerts/job-alerts.component').then((m) => m.JobAlertsComponent),
        title: 'Mes alertes emploi — AfriDev Hub',
      },
      { path: 'profil', loadChildren: () => import('../profile/profile.routes').then((m) => m.PROFILE_ROUTES) },
      {
        path: 'offres',
        loadComponent: () => import('../jobs/my-jobs/my-jobs.component').then((m) => m.MyJobsComponent),
        title: 'Mes offres — AfriDev Hub',
      },
      {
        path: 'plan',
        loadComponent: () => import('../jobs/recruiter-plan/recruiter-plan.component').then((m) => m.RecruiterPlanComponent),
        title: 'Plan recruteur — AfriDev Hub',
      },
      {
        path: 'moderation/signalements',
        ...MODERATION,
        loadComponent: () => import('../admin/reports/reports.component').then((m) => m.ReportsComponent),
        title: 'Signalements — AfriDev Hub',
      },
      {
        path: 'moderation/offres',
        ...MODERATION,
        loadComponent: () => import('../admin/jobs/admin-jobs.component').then((m) => m.AdminJobsComponent),
        title: 'Offres à valider — AfriDev Hub',
      },
      {
        path: 'administration/indicateurs',
        ...ADMIN_ONLY,
        loadComponent: () => import('../admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
        title: 'Indicateurs — AfriDev Hub',
      },
      {
        path: 'administration/utilisateurs',
        ...ADMIN_ONLY,
        loadComponent: () => import('../admin/users/admin-users.component').then((m) => m.AdminUsersComponent),
        title: 'Utilisateurs — AfriDev Hub',
      },
      {
        path: 'administration/audit',
        ...ADMIN_ONLY,
        loadComponent: () => import('../admin/audit/audit-log.component').then((m) => m.AuditLogComponent),
        title: 'Journal d\'audit — AfriDev Hub',
      },
    ],
  },
];
