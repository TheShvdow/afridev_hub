import { Component, input } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

export const QUESTION_MAX_TAGS = 5;

export type QuestionForm = FormGroup<{
  title: FormControl<string>;
  body: FormControl<string>;
  tags: FormControl<string[]>;
}>;

// Création et modification d'une question partagent les mêmes champs et les mêmes règles.
export function createQuestionForm(fb: FormBuilder): QuestionForm {
  return fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(50000)]],
    tags: fb.nonNullable.control<string[]>([], [Validators.required]),
  });
}

// Champs titre, contenu et tags d'une question. Le contenu projeté s'affiche sous le titre
// (par exemple les questions similaires, propres à la création).
@Component({
  selector: 'app-question-fields',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './question-fields.component.html',
  // Garde l'espacement des champs, qui étaient auparavant des enfants directs du formulaire.
  host: { class: 'flex flex-col gap-8' },
})
export class QuestionFieldsComponent {
  readonly form = input.required<QuestionForm>();
  readonly maxTags = QUESTION_MAX_TAGS;
  readonly tagInput = new FormControl('', { nonNullable: true });

  addTag(): void {
    const name = this.tagInput.value.trim().replace(/^#+/, '');
    if (!name) return;

    const control = this.form().controls.tags;
    const tags = control.value;
    if (tags.length >= QUESTION_MAX_TAGS) return;

    const duplicate = tags.some((tag) => tag.toLowerCase() === name.toLowerCase());
    if (!duplicate) {
      control.setValue([...tags, name]);
      control.markAsTouched();
    }

    this.tagInput.setValue('');
  }

  removeTag(tag: string): void {
    const control = this.form().controls.tags;
    control.setValue(control.value.filter((current) => current !== tag));
    control.markAsTouched();
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
      return;
    }

    if (event.key === 'Backspace' && !this.tagInput.value) {
      const tags = this.form().controls.tags.value;
      if (tags.length > 0) this.removeTag(tags[tags.length - 1]);
    }
  }

  // Une saisie de tag non validée ne doit pas être perdue à la soumission.
  flushPendingTag(): void {
    if (this.tagInput.value.trim()) this.addTag();
  }
}
