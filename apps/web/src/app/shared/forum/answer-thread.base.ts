import { Directive, WritableSignal, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ForumAnswer, ForumPostDetail, ForumService } from '../../core/services/forum.service';
import { VotesService, VoteValue } from '../../core/services/votes.service';
import { AuthStore } from '../../core/store/auth.store';
import { ToastService } from '../../core/services/toast.service';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { initialsFrom, relativeTime } from '../utils/forum-thread.mapper';

/** Règle du glossaire : une réponse fait au moins 30 caractères (comme `CreateAnswerDto`). */
export const ANSWER_MIN_LENGTH = 30;

function trimmedMinLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = String(control.value ?? '').trim().length;
    return length > 0 && length < min ? { minlength: { requiredLength: min, actualLength: length } } : null;
  };
}

type AuthorLike = { displayName?: string | null; username: string };

// Réponses d'une question : publication, suppression avec confirmation et droits.
// Partagé par la page de détail et la modale du forum, qui exposent la question dans `post`.
@Directive()
export abstract class AnswerThreadBase {
  protected readonly forum = inject(ForumService);
  protected readonly authStore = inject(AuthStore);
  protected readonly toast = inject(ToastService);
  protected readonly votes = inject(VotesService);

  abstract readonly post: WritableSignal<ForumPostDetail | null>;

  readonly answering = signal(false);
  readonly answerError = signal<string | null>(null);
  readonly confirmingAnswerId = signal<string | null>(null);
  readonly deletingAnswerId = signal<string | null>(null);
  readonly answerDeleteError = signal<string | null>(null);
  readonly editingAnswerId = signal<string | null>(null);
  readonly savingEdit = signal(false);
  readonly editError = signal<string | null>(null);
  /** Identifiant du contenu dont un vote ou une acceptation est en cours. */
  readonly pendingActionId = signal<string | null>(null);

  readonly answerForm = inject(FormBuilder).nonNullable.group({
    body: ['', [Validators.required, trimmedMinLength(ANSWER_MIN_LENGTH), Validators.maxLength(50000)]],
  });

  readonly editForm = inject(FormBuilder).nonNullable.group({
    body: ['', [Validators.required, trimmedMinLength(ANSWER_MIN_LENGTH), Validators.maxLength(50000)]],
  });

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

  /** Seul l'auteur modifie sa réponse (même règle que l'API). */
  canEditAnswer(answer: ForumAnswer): boolean {
    const me = this.authStore.currentUser();
    return !!me && me.id === answer.user.id && !answer.isHidden;
  }

  startAnswerEdit(answer: ForumAnswer): void {
    if (this.savingEdit()) return;

    this.editError.set(null);
    this.editForm.reset({ body: answer.body });
    this.editingAnswerId.set(answer.id);
  }

  cancelAnswerEdit(): void {
    if (this.savingEdit()) return;

    this.editingAnswerId.set(null);
    this.editError.set(null);
  }

  saveAnswerEdit(answer: ForumAnswer): void {
    if (this.savingEdit()) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    const body = this.editForm.getRawValue().body.trim();
    this.savingEdit.set(true);
    this.editError.set(null);

    this.forum.updateAnswer(answer.id, { body }).subscribe({
      next: (updated) => {
        this.savingEdit.set(false);
        this.patchAnswer(answer.id, { body: updated.body ?? body });
        this.editingAnswerId.set(null);
        this.toast.success('Réponse modifiée.');
      },
      error: (error: HttpErrorResponse) => {
        this.savingEdit.set(false);
        this.editError.set(
          error.status === 403 ? "Vous n'êtes pas autorisé à modifier cette réponse." : extractApiErrorMessage(error),
        );
      },
    });
  }

  /** Un membre connecté peut voter sur le contenu des autres (la réputation est vérifiée par l'API). */
  canVote(authorId: string): boolean {
    const me = this.authStore.currentUser();
    return !!me && me.id !== authorId;
  }

  /** Seul l'auteur de la question accepte une réponse, une seule à la fois. */
  canAccept(answer: ForumAnswer): boolean {
    const me = this.authStore.currentUser();
    const question = this.post();
    return !!me && !!question && me.id === question.userId && !answer.isAccepted && !question.isHidden;
  }

  /** Change de score d'un vote : même sens = annulation, sens opposé = bascule (±2). */
  private static voteChange(current: VoteValue | null | undefined, value: VoteValue) {
    const sign = value === 'UP' ? 1 : -1;
    if (current === value) return { next: null, delta: -sign };
    return { next: value, delta: current ? 2 * sign : sign };
  }

  // Le score et le pouce changent tout de suite ; la réponse de l'API fait foi, et un refus
  // rétablit l'état précédent.
  voteOnQuestion(value: VoteValue): void {
    const question = this.post();
    if (!question || this.pendingActionId()) return;

    const previous = { voteScore: question.voteScore, userVote: question.userVote ?? null };
    const { next, delta } = AnswerThreadBase.voteChange(previous.userVote, value);
    this.patchQuestion({ voteScore: previous.voteScore + delta, userVote: next });

    this.pendingActionId.set(question.id);
    this.votes.votePost(question.id, value).subscribe({
      next: ({ action, newScore }) => {
        this.pendingActionId.set(null);
        this.patchQuestion({ voteScore: newScore, userVote: action === 'removed' ? null : value });
      },
      error: (error: HttpErrorResponse) => {
        this.patchQuestion(previous);
        this.failAction(error);
      },
    });
  }

  voteOnAnswer(answer: ForumAnswer, value: VoteValue): void {
    if (this.pendingActionId()) return;

    const previous = { voteScore: answer.voteScore, userVote: answer.userVote ?? null };
    const { next, delta } = AnswerThreadBase.voteChange(previous.userVote, value);
    this.patchAnswer(answer.id, { voteScore: previous.voteScore + delta, userVote: next });

    this.pendingActionId.set(answer.id);
    this.votes.voteAnswer(answer.id, value).subscribe({
      next: ({ action, newScore }) => {
        this.pendingActionId.set(null);
        this.patchAnswer(answer.id, { voteScore: newScore, userVote: action === 'removed' ? null : value });
      },
      error: (error: HttpErrorResponse) => {
        this.patchAnswer(answer.id, previous);
        this.failAction(error);
      },
    });
  }

  acceptAnswer(answer: ForumAnswer): void {
    if (this.pendingActionId()) return;

    this.pendingActionId.set(answer.id);
    this.forum.acceptAnswer(answer.id).subscribe({
      next: () => {
        this.pendingActionId.set(null);
        const existing = this.post();
        if (existing) {
          this.post.set({
            ...existing,
            isResolved: true,
            answers: existing.answers.map((item) => ({ ...item, isAccepted: item.id === answer.id })),
          });
        }
        this.toast.success('Réponse acceptée.');
      },
      error: (error: HttpErrorResponse) => this.failAction(error),
    });
  }

  private patchQuestion(changes: Partial<ForumPostDetail>): void {
    const existing = this.post();
    if (existing) this.post.set({ ...existing, ...changes });
  }

  private patchAnswer(answerId: string, changes: Partial<ForumAnswer>): void {
    const existing = this.post();
    if (!existing) return;

    this.post.set({
      ...existing,
      answers: existing.answers.map((item) => (item.id === answerId ? { ...item, ...changes } : item)),
    });
  }

  private failAction(error: HttpErrorResponse): void {
    this.pendingActionId.set(null);
    this.toast.error(error.status === 401 ? 'Connectez-vous pour effectuer cette action.' : extractApiErrorMessage(error));
  }

  authorName(author: AuthorLike): string {
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

  initials(author: AuthorLike): string {
    return initialsFrom(this.authorName(author));
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }
}
