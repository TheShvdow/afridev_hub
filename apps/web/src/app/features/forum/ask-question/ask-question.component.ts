import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ForumService, SimilarPost } from '../../../core/services/forum.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

const MAX_TAGS = 5;

@Component({
  selector: 'app-ask-question',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './ask-question.component.html',
  styleUrl: './ask-question.component.css',
})
export class AskQuestionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly forum = inject(ForumService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly maxTags = MAX_TAGS;
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly similarPosts = signal<SimilarPost[]>([]);
  readonly loadingSimilar = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(50000)]],
    tags: this.fb.nonNullable.control<string[]>([], [Validators.required]),
  });

  readonly tagInput = this.fb.nonNullable.control('');

  constructor() {
    this.form.controls.title.valueChanges
      .pipe(
        map((title) => title.trim()),
        debounceTime(400),
        distinctUntilChanged(),
        switchMap((title) => {
          if (title.length < 5) {
            this.loadingSimilar.set(false);
            return of([]);
          }

          this.loadingSimilar.set(true);
          return this.forum.findSimilar(title).pipe(catchError(() => of([])));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((posts) => {
        this.similarPosts.set(posts);
        this.loadingSimilar.set(false);
      });
  }

  addTag(): void {
    const name = this.tagInput.value.trim().replace(/^#+/, '');
    if (!name) return;

    const tags = this.form.controls.tags.value;
    if (tags.length >= MAX_TAGS) return;

    const duplicate = tags.some((tag) => tag.toLowerCase() === name.toLowerCase());
    if (!duplicate) {
      this.form.controls.tags.setValue([...tags, name]);
      this.form.controls.tags.markAsTouched();
    }

    this.tagInput.setValue('');
  }

  removeTag(tag: string): void {
    this.form.controls.tags.setValue(
      this.form.controls.tags.value.filter((current) => current !== tag),
    );
    this.form.controls.tags.markAsTouched();
  }

  onTagKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.addTag();
      return;
    }

    if (event.key === 'Backspace' && !this.tagInput.value) {
      const tags = this.form.controls.tags.value;
      if (tags.length > 0) this.removeTag(tags[tags.length - 1]);
    }
  }

  submit(): void {
    if (this.loading()) return;

    // Une saisie de tag non validée ne doit pas être perdue à la soumission.
    if (this.tagInput.value.trim()) this.addTag();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, body, tags } = this.form.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.forum.createPost({ title: title.trim(), body: body.trim(), tags }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Votre question a été publiée.');
        this.router.navigateByUrl('/forum');
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
