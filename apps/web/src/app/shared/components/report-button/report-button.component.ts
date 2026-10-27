import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ModerationService,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  ReportEntityType,
  ReportReason,
} from '../../../core/services/moderation.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

// Bouton « Signaler » avec son formulaire (raison + précision facultative).
// Masqué pour les visiteurs et pour l'auteur du contenu.
@Component({
  selector: 'app-report-button',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './report-button.component.html',
  host: { class: 'relative inline-block' },
})
export class ReportButtonComponent {
  private readonly moderation = inject(ModerationService);
  private readonly authStore = inject(AuthStore);
  private readonly toast = inject(ToastService);

  readonly entityType = input.required<ReportEntityType>();
  readonly entityId = input.required<string>();
  readonly authorId = input.required<string>();
  readonly dark = input(false);

  readonly reasons = REPORT_REASONS;
  readonly maxLength = REPORT_DETAILS_MAX_LENGTH;
  readonly open = signal(false);
  readonly sending = signal(false);
  readonly sent = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly visible = computed(() => {
    const me = this.authStore.currentUser();
    return !!me && me.id !== this.authorId();
  });

  readonly form = inject(FormBuilder).nonNullable.group({
    reason: ['SPAM' as ReportReason, [Validators.required]],
    details: ['', [Validators.maxLength(REPORT_DETAILS_MAX_LENGTH)]],
  });

  toggle(): void {
    if (this.sent()) return;
    this.open.update((value) => !value);
    this.errorMessage.set(null);
  }

  submit(): void {
    if (this.sending() || this.form.invalid) return;

    const { reason, details } = this.form.getRawValue();
    this.sending.set(true);
    this.errorMessage.set(null);

    this.moderation
      .report({
        entityType: this.entityType(),
        entityId: this.entityId(),
        reason,
        details: details.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
          this.open.set(false);
          this.toast.success('Merci, votre signalement a été transmis à la modération.');
        },
        error: (error) => {
          this.sending.set(false);
          // Déjà signalé : l'état « envoyé » évite de proposer une seconde tentative.
          if (error?.status === 409) {
            this.sent.set(true);
            this.open.set(false);
          }
          this.errorMessage.set(extractApiErrorMessage(error));
          if (this.sent()) this.toast.error(this.errorMessage() as string);
        },
      });
  }
}
