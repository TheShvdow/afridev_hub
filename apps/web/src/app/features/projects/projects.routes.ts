import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./project-list/projets').then(
        (m) => m.Projets
      ),
    title: 'Projets — AfriDev Hub',
  },
  {
    path: 'new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./project-new/project-new.component').then(
        (m) => m.ProjectNewComponent
      ),
    title: 'Soumettre un projet — AfriDev Hub',
  },
  {
    path: ':id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./project-new/project-new.component').then(
        (m) => m.ProjectNewComponent
      ),
    title: 'Modifier un projet — AfriDev Hub',
  },
  {
    path: ':idOrSlug',
    loadComponent: () =>
      import('./project-detail/project-detail.component').then(
        (m) => m.ProjectDetailComponent
      ),
  },
];
