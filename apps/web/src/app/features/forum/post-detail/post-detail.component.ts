import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ForumPostDetail } from '../../../core/services/forum.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { ReportButtonComponent } from '../../../shared/components/report-button/report-button.component';
import { VoteControlComponent } from '../../../shared/components/vote-control/vote-control.component';
import { AnswerThreadBase } from '../../../shared/forum/answer-thread.base';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, ReportButtonComponent, VoteControlComponent],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css',
})
export class PostDetailComponent extends AnswerThreadBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly post = signal<ForumPostDetail | null>(null);
  readonly canEdit = computed(() => {
    const me = this.authStore.currentUser();
    const post = this.post();
    return !!me && !!post && !post.isHidden && me.id === post.userId;
  });
  readonly canDelete = computed(() => {
    const me = this.authStore.currentUser();
    const post = this.post();
    if (!me || !post) return false;

    const isModerator = me.role === 'ADMIN' || me.role === 'MODERATOR';
    return isModerator || me.id === post.userId;
  });
  readonly isAuthenticated = computed(() => this.authStore.isAuthenticated());
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);


  private currentId: string | null = null;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmingDelete() && !this.deleting()) {
      this.confirmingDelete.set(false);
    }
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.load(params.get('id')));
  }

  load(id: string | null): void {
    this.currentId = id;

    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.forum
      .getPost(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post) => {
          this.post.set(post);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);

          if (error.status === 404) {
            this.notFound.set(true);
            return;
          }

          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  retry(): void {
    this.load(this.currentId);
  }

  openDeleteConfirm(): void {
    this.deleteError.set(null);
    this.confirmingDelete.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.confirmingDelete.set(false);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const id = this.post()?.id;
    if (!id || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.forum.deletePost(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.toast.success('Question supprimée.');
        this.router.navigateByUrl('/forum');
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);

        if (error.status === 404) {
          this.deleteError.set('Cette question a déjà été supprimée.');
          return;
        }

        if (error.status === 403) {
          this.deleteError.set("Vous n'êtes pas autorisé à supprimer cette question.");
          return;
        }

        this.deleteError.set(extractApiErrorMessage(error));
      },
    });
  }
<<<<<<< HEAD

  submitAnswer(): void {
    if (this.answering()) return;

    if (this.answerForm.invalid) {
      this.answerForm.markAllAsTouched();
      return;
    }

    const question = this.post();
    if (!question) return;

    const { body } = this.answerForm.getRawValue();
    this.answering.set(true);
    this.answerError.set(null);

    this.forum.createAnswer(question.id, { body: body.trim() }).subscribe({
      next: (answer) => {
        this.answering.set(false);
        const existing = this.post();
        if (existing) {
          this.post.set({
            ...existing,
            answers: [...existing.answers, answer as ForumAnswer],
            _count: { answers: (existing._count?.answers ?? existing.answers.length) + 1 },
          });
        }
        this.answerForm.reset({ body: '' });
        this.toast.success('Réponse publiée.');
      },
      error: (error: HttpErrorResponse) => {
        this.answering.set(false);

        if (error.status === 401) {
          this.answerError.set('Connectez-vous pour répondre à cette question.');
          return;
        }
        if (error.status === 403) {
          this.answerError.set("Vous ne pouvez pas répondre à votre propre question.");
          return;
        }

        this.answerError.set(extractApiErrorMessage(error));
      },
    });
  }

  votePost(value: 'UP' | 'DOWN'): void {
    const post = this.post();
    if (!post || !this.isAuthenticated()) return;
    this.forum.votePost(post.id, value).subscribe({
      next: (res: any) => {
        this.post.update((p) => p ? { ...p, voteScore: res.newScore } : p);
      },
      error: () => {},
    });
  }

  voteAnswer(answer: ForumAnswer, value: 'UP' | 'DOWN'): void {
    if (!this.isAuthenticated()) return;
    this.forum.voteAnswer(answer.id, value).subscribe({
      next: (res: any) => {
        this.post.update((p) => {
          if (!p) return p;
          return {
            ...p,
            answers: p.answers.map((a) => (a.id === answer.id ? { ...a, voteScore: res.newScore } : a)),
          };
        });
      },
      error: () => {},
    });
  }

  authorName(author: ForumAuthorSummary): string {
    return author.displayName ?? author.username;
  }

  canDeleteAnswer(answer: ForumAnswer): boolean {
    const me = this.authStore.currentUser();
    if (!me) return false;

    const isModerator = me.role === 'ADMIN' || me.role === 'MODERATOR';
    return isModerator || me.id === answer.user.id;
  }

  requestAnswerDelete(answerId: string): void {
    if (this.deletingAnswerId()) return;

    this.answerDeleteError.set(null);
    this.confirmingAnswerId.set(answerId);
  }

  cancelAnswerDelete(): void {
    if (this.deletingAnswerId()) return;

    this.confirmingAnswerId.set(null);
    this.answerDeleteError.set(null);
  }

  deleteAnswer(answerId: string): void {
    if (this.deletingAnswerId()) return;

    this.deletingAnswerId.set(answerId);
    this.answerDeleteError.set(null);

    this.forum.deleteAnswer(answerId).subscribe({
      next: () => {
        const existing = this.post();
        if (existing) {
          this.post.set({
            ...existing,
            answers: existing.answers.filter((answer) => answer.id !== answerId),
            _count: {
              answers: Math.max(0, (existing._count?.answers ?? existing.answers.length) - 1),
            },
          });
        }

        this.deletingAnswerId.set(null);
        this.confirmingAnswerId.set(null);
        this.toast.success('Réponse supprimée.');
      },
      error: (error: HttpErrorResponse) => {
        this.deletingAnswerId.set(null);

        if (error.status === 401) {
          this.answerDeleteError.set('Connectez-vous pour supprimer cette réponse.');
          return;
        }
        if (error.status === 403) {
          this.answerDeleteError.set("Vous n'êtes pas autorisé à supprimer cette réponse.");
          return;
        }
        if (error.status === 404) {
          this.answerDeleteError.set('Cette réponse a déjà été supprimée.');
          return;
        }

        this.answerDeleteError.set(extractApiErrorMessage(error));
      },
    });
  }

  initials(author: ForumAuthorSummary): string {
    return initialsFrom(this.authorName(author));
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }
=======
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
}
