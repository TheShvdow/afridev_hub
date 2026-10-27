import { Component, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ForumService, SimilarPost } from '../../../core/services/forum.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { QuestionFieldsComponent, createQuestionForm } from '../question-fields/question-fields.component';

@Component({
  selector: 'app-ask-question',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent, QuestionFieldsComponent],
  templateUrl: './ask-question.component.html',
  styleUrl: './ask-question.component.css',
})
export class AskQuestionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly forum = inject(ForumService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly similarPosts = signal<SimilarPost[]>([]);
  readonly loadingSimilar = signal(false);

  readonly form = createQuestionForm(this.fb);

  private readonly fields = viewChild(QuestionFieldsComponent);

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

  submit(): void {
    if (this.loading()) return;

    this.fields()?.flushPendingTag();

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
