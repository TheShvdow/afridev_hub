import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ForumPostDetail, ForumService } from '../../../core/services/forum.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

const MAX_TAGS = 5;

@Component({
  selector: 'app-post-edit',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './post-edit.component.html',
  styleUrl: './post-edit.component.css',
})
export class PostEditComponent {
  private readonly fb = inject(FormBuilder);
  private readonly forum = inject(ForumService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly authStore = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly maxTags = MAX_TAGS;
  readonly postId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly notFound = signal(false);
  readonly forbidden = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(15), Validators.maxLength(200)]],
    body: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(50000)]],
    tags: this.fb.nonNullable.control<string[]>([], [Validators.required]),
  });

  readonly tagInput = this.fb.nonNullable.control('');

  private currentId: string | null = null;

  constructor() {
    this.route.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => this.load(params.get('id')));
  }

  load(id: string | null): void {
    this.currentId = id;
    this.postId.set(id);
    this.loading.set(true);
    this.notFound.set(false);
    this.forbidden.set(false);
    this.loadError.set(null);
    this.errorMessage.set(null);

    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.forum
      .getPost(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post) => this.applyPost(post),
        error: (error) => {
          this.loading.set(false);
          if (error?.status === 404) {
            this.notFound.set(true);
            return;
          }
          if (error?.status === 403) {
            this.forbidden.set(true);
            return;
          }
          this.loadError.set(extractApiErrorMessage(error));
        },
      });
  }

  retry(): void {
    this.load(this.currentId);
  }

  private applyPost(post: ForumPostDetail): void {
    const me = this.authStore.currentUser();

    if (post.isHidden || (me && me.id !== post.userId)) {
      this.loading.set(false);
      this.forbidden.set(true);
      return;
    }

    this.form.patchValue({
      title: post.title,
      body: post.body,
      tags: post.postTags.map((postTag) => postTag.tag.name),
    });
    this.loading.set(false);
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
    if (this.saving() || this.loading()) return;

    // Une saisie de tag non validée ne doit pas être perdue à la soumission.
    if (this.tagInput.value.trim()) this.addTag();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const id = this.postId();
    if (!id) return;

    const { title, body, tags } = this.form.getRawValue();

    this.saving.set(true);
    this.errorMessage.set(null);

    this.forum.updatePost(id, { title: title.trim(), body: body.trim(), tags }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Question mise à jour.');
        this.router.navigate(['/forum', id]);
      },
      error: (error) => {
        this.saving.set(false);
        if (error?.status === 403) {
          this.forbidden.set(true);
          return;
        }
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
