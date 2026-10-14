import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth.guard';

export const FORUM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./post-list/post-list.component').then((m) => m.PostListComponent),
    title: 'Forum — AfriDev Hub',
  },
  {
    path: 'ask',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./ask-question/ask-question.component').then(
        (m) => m.AskQuestionComponent
      ),
    title: 'Poser une question — AfriDev Hub',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./post-detail/post-detail.component').then(
        (m) => m.PostDetailComponent
      ),
  },
  {
    path: ':id/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./post-edit/post-edit.component').then((m) => m.PostEditComponent),
  },
];
