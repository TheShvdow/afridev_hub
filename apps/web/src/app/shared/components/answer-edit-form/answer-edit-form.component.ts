import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

// Formulaire de modification d'une réponse, partagé par la page de détail et la modale du forum.
@Component({
  selector: 'app-answer-edit-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form class="mt-3 flex flex-col gap-3" [formGroup]="form()" (ngSubmit)="saved.emit()" novalidate>
      <textarea
        formControlName="body"
        rows="5"
        aria-label="Modifier votre réponse"
        class="w-full rounded-2xl border border-[#E2E8F0] px-4 py-3 text-[15px] leading-[24px] text-[#141219] focus:border-[#0F6932] focus:outline-none"
      ></textarea>
      @if (form().controls.body.touched && form().controls.body.invalid) {
        <p role="alert" class="text-[13px] font-medium text-[#FB2C36]">
          {{ form().controls.body.hasError('required') ? 'La réponse est requise.' : 'La réponse doit contenir au moins 30 caractères.' }}
        </p>
      }
      @if (error()) {
        <p role="alert" class="text-[13px] font-medium text-[#FB2C36]">{{ error() }}</p>
      }
      <div class="flex justify-end gap-2">
        <button type="button" (click)="cancelled.emit()" [disabled]="saving()" class="rounded-full border border-[#E2E8F0] px-3 py-1 text-[13px] font-semibold text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-60">Annuler</button>
        <button type="submit" [disabled]="saving()" class="rounded-full bg-[#0F6932] px-3 py-1 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60">{{ saving() ? 'Enregistrement…' : 'Enregistrer' }}</button>
      </div>
    </form>
  `,
})
export class AnswerEditFormComponent {
  readonly form = input.required<FormGroup<{ body: FormControl<string> }>>();
  readonly saving = input(false);
  readonly error = input<string | null>(null);
  readonly saved = output<void>();
  readonly cancelled = output<void>();
}
