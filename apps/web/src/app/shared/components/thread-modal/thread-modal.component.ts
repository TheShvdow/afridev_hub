import { Component, DestroyRef, HostListener, computed, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommentItem } from '../comment-item/comment-item';
import { Thread } from '../card-thread/card-thread.component';
import { ForumPostDetail } from '../../../core/services/forum.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { AnswerThreadBase } from '../../forum/answer-thread.base';

@Component({
  selector: 'app-thread-modal',
  standalone: true,
  imports: [CommentItem, ReactiveFormsModule, RouterLink],
  templateUrl: './thread-modal.component.html',
})
export class ThreadModalComponent extends AnswerThreadBase {
  private readonly destroyRef = inject(DestroyRef);

  readonly thread = input<Thread | null>(null);
  readonly closed = output<void>();

  readonly post = signal<ForumPostDetail | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly isAuthenticated = computed(() => this.authStore.isAuthenticated());


  constructor() {
    super();
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
