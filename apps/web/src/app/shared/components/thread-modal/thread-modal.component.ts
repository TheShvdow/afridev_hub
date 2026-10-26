import { Component, DestroyRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommentItem } from '../comment-item/comment-item';
import { Thread } from '../card-thread/card-thread.component';
import { ForumAnswer, ForumPostDetail, ForumService } from '../../../core/services/forum.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { initialsFrom, relativeTime } from '../../utils/forum-thread.mapper';

@Component({
  selector: 'app-thread-modal',
  standalone: true,
  imports: [CommentItem, ReactiveFormsModule, RouterLink],
  templateUrl: './thread-modal.component.html',
  styleUrl: './thread-modal.component.css',
})
export class ThreadModalComponent {
  private readonly forum = inject(ForumService);
  private readonly authStore = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly thread = input<Thread | null>(null);
  readonly closed = output<void>();

  readonly post = signal<ForumPostDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly answering = signal(false);
  readonly answerError = signal<string | null>(null);
  readonly confirmingAnswerId = signal<string | null>(null);
  readonly deletingAnswerId = signal<string | null>(null);
  readonly answerDeleteError = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.authStore.isAuthenticated());

  readonly answerForm = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(50000)]],
  });

  constructor() {
    effect(() => {
      const thread = this.thread();
      if (!thread) {
        this.reset();
        return;
      }

      this.load(thread.id);
    }, { allowSignalWrites: true });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.thread()) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  load(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.post.set(null);
    this.answerError.set(null);
    this.answerForm.reset({ body: '' });
    this.confirmingAnswerId.set(null);
    this.deletingAnswerId.set(null);
    this.answerDeleteError.set(null);

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
            this.error.set('Cette question est introuvable.');
            return;
          }
          this.error.set(extractApiErrorMessage(error));
        },
      });
  }

  submitAnswer(): void {
    if (this.answering()) return;
    const current = this.post();
    if (!current) return;

    if (this.answerForm.invalid) {
      this.answerForm.markAllAsTouched();
      return;
    }

    const { body } = this.answerForm.getRawValue();
    this.answering.set(true);
    this.answerError.set(null);

    this.forum.createAnswer(current.id, { body: body.trim() }).subscribe({
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

  authorName(user: { displayName?: string | null; username: string }): string {
    return user.displayName ?? user.username;
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

  initials(user: { displayName?: string | null; username: string }): string {
    return initialsFrom(this.authorName(user));
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }

  private reset(): void {
    this.post.set(null);
    this.loading.set(false);
    this.error.set(null);
    this.answering.set(false);
    this.answerError.set(null);
    this.answerForm.reset({ body: '' });
    this.confirmingAnswerId.set(null);
    this.deletingAnswerId.set(null);
    this.answerDeleteError.set(null);
  }
}
