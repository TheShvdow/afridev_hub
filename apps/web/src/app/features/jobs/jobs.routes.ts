import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const JOBS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./job-list/job-list.component').then((m) => m.JobListComponent),
    title: "Offres d'emploi — AfriDev Hub",
  },
  {
    path: 'mine',
    canActivate: [authGuard],
    loadComponent: () => import('./my-jobs/my-jobs.component').then((m) => m.MyJobsComponent),
    title: 'Mes offres — AfriDev Hub',
  },
  {
    path: 'alerts',
    canActivate: [authGuard],
    loadComponent: () => import('./alerts/job-alerts.component').then((m) => m.JobAlertsComponent),
    title: 'Mes alertes emploi — AfriDev Hub',
  },
  {
    path: 'post',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./job-post/job-post.component').then((m) => m.JobPostComponent),
    title: 'Publier une offre — AfriDev Hub',
  },
  {
<<<<<<< HEAD
    path: ':id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./job-edit/job-edit.component').then((m) => m.JobEditComponent),
    title: "Modifier l'offre — AfriDev Hub",
=======
    path: 'alerts',
    canActivate: [authGuard],
    loadComponent: () => import('./job-alerts/job-alerts.component').then((m) => m.JobAlertsComponent),
    title: 'Mes alertes emploi — AfriDev Hub',
  },
  {
    path: 'mine',
    canActivate: [authGuard],
    loadComponent: () => import('./my-jobs/my-jobs.component').then((m) => m.MyJobsComponent),
    title: 'Mes offres — AfriDev Hub',
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./job-detail/job-detail.component').then(
        (m) => m.JobDetailComponent
      ),
  },
  {
<<<<<<< HEAD
    path: ':id/applications',
    canActivate: [authGuard],
    loadComponent: () => import('./job-applications/job-applications.component').then((m) => m.JobApplicationsComponent),
    title: 'Candidatures — AfriDev Hub',
=======
    path: ':id/edit',
    canActivate: [authGuard],
    loadComponent: () => import('./job-post/job-post.component').then((m) => m.JobPostComponent),
    title: 'Modifier une offre — AfriDev Hub',
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
  },
  {
    path: ':id/apply',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./job-apply/job-apply.component').then((m) => m.JobApplyComponent),
  },
];
