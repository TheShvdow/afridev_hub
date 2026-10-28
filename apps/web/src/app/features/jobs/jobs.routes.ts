import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const JOBS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./job-list/job-list.component').then((m) => m.JobListComponent),
    title: 'Offres d\'emploi — AfriDev Hub',
  },
  {
    path: 'post',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./job-post/job-post.component').then((m) => m.JobPostComponent),
    title: 'Publier une offre — AfriDev Hub',
  },
  {
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
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./job-detail/job-detail.component').then(
        (m) => m.JobDetailComponent
      ),
  },
  {
    path: ':id/apply',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./job-apply/job-apply.component').then((m) => m.JobApplyComponent),
  },
];
