import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { CountriesService, Country } from '../../../core/services/countries.service';
import {
  CreateProjectDto,
  ProjectCategory,
  ProjectDetail,
  ProjectsService,
} from '../../../core/services/projects.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorCode, extractApiErrorMessage } from '../../../core/utils/api-error';

const MAX_TAGS = 5;
const GITHUB_REPO_URL =
  /^https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9-]{1,39}\/[A-Za-z0-9_.-]{1,100}(?:\.git)?\/?$/;

@Component({
  selector: 'app-project-new',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './project-new.component.html',
  styleUrl: './project-new.component.css',
})
export class ProjectNewComponent {
  private readonly fb = inject(FormBuilder);
  private readonly projects = inject(ProjectsService);
  private readonly countriesService = inject(CountriesService);
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly maxTags = MAX_TAGS;
  readonly loading = signal(false);
  readonly loadingProject = signal(false);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly categories = signal<ProjectCategory[]>([]);
  readonly countries = signal<Country[]>([]);
  readonly editId = signal<string | null>(null);
  readonly loadedProject = signal<ProjectDetail | null>(null);

  readonly isEdit = computed(() => this.editId() !== null);

  readonly forbidden = computed(() => {
    const project = this.loadedProject();
    const me = this.authStore.currentUser();
    return !!project && !!me && project.user.id !== me.id;
  });

  readonly cancelHref = computed(() => {
    const id = this.editId();
    return id ? `/projects/${id}` : '/projets';
  });

  readonly submitLabel = computed(() => {
    if (this.loading()) return this.isEdit() ? 'Enregistrement…' : 'Publication…';
    return this.isEdit() ? 'Enregistrer les modifications' : 'Publier le projet';
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(10000)]],
    country: ['', [Validators.required]],
    repoUrl: ['', [Validators.required, Validators.pattern(GITHUB_REPO_URL)]],
    demoUrl: ['', [Validators.pattern(/^https?:\/\/\S+$/)]],
    tags: this.fb.nonNullable.control<string[]>([], [Validators.required]),
    categorySlug: ['', [Validators.required]],
  });

  readonly tagInput = this.fb.nonNullable.control('');

  constructor() {
    this.projects.listCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.errorMessage.set('Impossible de charger les catégories.'),
    });

    this.countriesService.list().subscribe({
      next: (countries) => this.countries.set(countries),
      error: () => this.errorMessage.set('Impossible de charger la liste des pays.'),
    });

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.loadForEdit(params.get('id')));
  }

  private loadForEdit(id: string | null): void {
    this.editId.set(id);
    this.loadedProject.set(null);
    this.notFound.set(false);
    this.loadingProject.set(false);

    if (!id) return;

    this.loadingProject.set(true);
    this.errorMessage.set(null);

    this.projects
      .getProject(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (project) => {
          this.loadedProject.set(project);
          this.form.patchValue({
            name: project.name,
            description: project.description,
            country: project.country,
            repoUrl: project.repoUrl,
            demoUrl: project.demoUrl ?? '',
            tags: project.projectTags.map((link) => link.tag.name),
            categorySlug: project.category?.slug ?? '',
          });
          this.loadingProject.set(false);
        },
        error: (error) => {
          this.loadingProject.set(false);
          if (error?.status === 404) {
            this.notFound.set(true);
            return;
          }
          this.errorMessage.set(extractApiErrorMessage(error));
        },
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
    if (this.loading() || this.loadingProject()) return;

    if (this.forbidden()) {
      this.errorMessage.set('Vous ne pouvez modifier que vos propres projets.');
      return;
    }

    if (this.tagInput.value.trim()) this.addTag();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, country, repoUrl, demoUrl, tags, categorySlug } =
      this.form.getRawValue();

    const demo = demoUrl.trim();
    const payload: CreateProjectDto = {
      name: name.trim(),
      description: description.trim(),
      country,
      repoUrl: repoUrl.trim(),
      demoUrl: demo || undefined,
      tags: tags.map((tag) => tag.toLowerCase()),
      categorySlug,
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    const editId = this.editId();

    if (editId) {
      this.projects.updateProject(editId, { ...payload, demoUrl: demo || null }).subscribe({
        next: (project) => {
          this.loading.set(false);
          this.toast.success('Le projet a été mis à jour.');
          this.router.navigate(['/projects', project.slug]);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(this.resolveError(error));
        },
      });
      return;
    }

    this.projects.createProject(payload).subscribe({
      next: (project) => {
        this.loading.set(false);
        this.toast.success('Votre projet a été publié.');
        if (project.githubImport === 'unavailable') {
          this.toast.info(
            'Les statistiques GitHub seront importées automatiquement dès que possible.',
          );
        }
        this.router.navigate(['/projects', project.slug]);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(this.resolveError(error));
      },
    });
  }

  private resolveError(error: unknown): string {
    const code = extractApiErrorCode(error);

    if (code === 'PROJECTS_VERIFIED_BADGE_REQUIRED') {
      return 'Le badge « dev vérifié » est requis pour soumettre un projet. Complétez votre profil (email confirmé, pays, stack, bio de 50 caractères minimum et un lien externe), puis réessayez.';
    }

    if (code === 'PROJECTS_FORBIDDEN') {
      return 'Vous ne pouvez modifier que les projets dont vous êtes l’auteur.';
    }

    if (code === 'PROJECTS_PROJECT_NOT_FOUND') {
      return 'Ce projet n’existe plus ou a été retiré de la vitrine.';
    }

    if (code === 'PROJECTS_GITHUB_URL_INVALID' || code === 'PROJECTS_GITHUB_REPO_NOT_FOUND') {
      return 'Le dépôt GitHub est introuvable, privé ou ne pointe pas vers un dépôt. Vérifiez le lien et réessayez.';
    }

    if (code === 'PROJECTS_REPO_ALREADY_SUBMITTED') {
      return 'Ce dépôt a déjà été soumis par un membre.';
    }

    return extractApiErrorMessage(error);
  }
}
