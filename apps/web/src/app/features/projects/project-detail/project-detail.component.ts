import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
  HostListener,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProjectsService, ProjectDetail } from '../../../core/services/projects.service';
import { CountriesService } from '../../../core/services/countries.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { compactCount } from '../../../shared/utils/project-card.mapper';
import { initialsFrom, relativeTime } from '../../../shared/utils/forum-thread.mapper';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projectsService = inject(ProjectsService);
  private readonly countriesService = inject(CountriesService);
  private readonly authStore = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly project = signal<ProjectDetail | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private readonly countryNames = signal<ReadonlyMap<string, string>>(new Map());
  private currentId: string | null = null;

  readonly authorName = computed(() => {
    const project = this.project();
    if (!project) return '';
    return project.user.displayName ?? project.user.username;
  });

  readonly authorInitials = computed(() => initialsFrom(this.authorName()));

  readonly countryName = computed(() => {
    const project = this.project();
    if (!project) return '';
    return this.countryNames().get(project.country) ?? project.country;
  });

  readonly stars = computed(() => compactCount(this.project()?.githubStars ?? 0));
  readonly forks = computed(() => compactCount(this.project()?.githubForks ?? 0));
  readonly communityStars = computed(() => compactCount(this.project()?._count.stars ?? 0));

  readonly starLabel = computed(() => {
    if (this.starring()) return 'Mise à jour…';
    return this.project()?.starredByViewer ? 'Retirer mon étoile' : 'Étoiler ce projet';
  });

  readonly canEdit = computed(() => {
    const project = this.project();
    const me = this.authStore.currentUser();
    return !!project && !!me && project.user.id === me.id;
  });

  readonly canDelete = computed(() => {
    const project = this.project();
    const me = this.authStore.currentUser();
    if (!project || !me) return false;

    const isModerator = me.role === 'ADMIN' || me.role === 'MODERATOR';
    return isModerator || project.user.id === me.id;
  });

  readonly canRefresh = computed(() => {
    const project = this.project();
    const me = this.authStore.currentUser();
    if (!project || !me) return false;

    const isModerator = me.role === 'ADMIN' || me.role === 'MODERATOR';
    return isModerator || project.user.id === me.id;
  });

  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);
  readonly starring = signal(false);
  readonly starError = signal<string | null>(null);
  readonly refreshing = signal(false);
  readonly refreshError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCountries();

    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.load(params.get('idOrSlug')));
  }

  load(idOrSlug: string | null): void {
    this.currentId = idOrSlug;

    if (!idOrSlug) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.projectsService
      .getProject(idOrSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (project) => {
          this.project.set(project);
          this.loading.set(false);
          this.applyMetadata(project);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);

          if (error.status === 404) {
            this.notFound.set(true);
            this.title.setTitle('Projet introuvable — AfriDev Hub');
            return;
          }

          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  retry(): void {
    this.load(this.currentId);
  }

  toggleStar(): void {
    const project = this.project();
    if (!project || this.starring()) return;

    if (!this.authStore.isAuthenticated()) {
      this.goToLogin();
      return;
    }

    this.starring.set(true);
    this.starError.set(null);

    this.projectsService.toggleStar(project.id).subscribe({
      next: (result) => {
        this.starring.set(false);
        this.project.update((current) =>
          current
            ? {
                ...current,
                starredByViewer: result.starred,
                _count: { ...current._count, stars: result.stars },
              }
            : current,
        );
        this.toast.success(result.starred ? 'Étoile ajoutée.' : 'Étoile retirée.');
      },
      error: (error: HttpErrorResponse) => {
        this.starring.set(false);

        if (error.status === 401) {
          this.goToLogin();
          return;
        }

        if (error.status === 404) {
          this.starError.set('Ce projet a été supprimé.');
          return;
        }

        this.starError.set(extractApiErrorMessage(error));
      },
    });
  }

  private goToLogin(): void {
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  refreshStats(): void {
    const project = this.project();
    if (!project || this.refreshing() || !this.canRefresh()) return;

    this.refreshing.set(true);
    this.refreshError.set(null);

    this.projectsService.refreshProject(project.id).subscribe({
      next: (updated) => {
        this.refreshing.set(false);
        this.project.update((current) =>
          current
            ? {
                ...current,
                githubStars: updated.githubStars,
                githubForks: updated.githubForks,
                githubLanguage: updated.githubLanguage,
                githubLastPush: updated.githubLastPush,
                githubSyncedAt: updated.githubSyncedAt,
              }
            : current,
        );

        if (updated.githubImport === 'imported') {
          this.toast.success('Les statistiques GitHub ont été mises à jour.');
          return;
        }

        if (updated.githubImport === 'removed') {
          this.toast.warning(
            'Le dépôt GitHub est introuvable ou privé. Les dernières statistiques connues sont conservées.',
          );
          return;
        }

        this.toast.warning(
          'GitHub est momentanément indisponible. Les statistiques seront réessayées plus tard.',
        );
      },
      error: (error: HttpErrorResponse) => {
        this.refreshing.set(false);

        if (error.status === 401) {
          this.goToLogin();
          return;
        }

        if (error.status === 429) {
          this.refreshError.set(
            'Les statistiques ont déjà été rafraîchies il y a moins d’une heure.',
          );
          return;
        }

        if (error.status === 403) {
          this.refreshError.set(
            "Seul l'auteur du projet ou la modération peut rafraîchir les statistiques.",
          );
          return;
        }

        if (error.status === 404) {
          this.refreshError.set('Ce projet a été supprimé.');
          return;
        }

        this.refreshError.set(extractApiErrorMessage(error));
      },
    });
  }

  openDeleteConfirm(): void {
    if (!this.canDelete()) return;
    this.deleteError.set(null);
    this.confirmingDelete.set(true);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmingDelete()) this.cancelDelete();
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.confirmingDelete.set(false);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const project = this.project();
    if (!project || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.projectsService.deleteProject(project.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.toast.success('Projet supprimé.');
        this.router.navigateByUrl('/projets');
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);

        if (error.status === 404) {
          this.deleteError.set('Ce projet a déjà été supprimé.');
          return;
        }

        if (error.status === 403) {
          this.deleteError.set("Vous n'êtes pas autorisé à supprimer ce projet.");
          return;
        }

        this.deleteError.set(extractApiErrorMessage(error));
      },
    });
  }

  timeAgo(iso: string | null): string {
    return iso ? relativeTime(iso) : '—';
  }

  private loadCountries(): void {
    this.countriesService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (countries) =>
          this.countryNames.set(
            new Map(countries.map((country) => [country.code, country.name])),
          ),
        error: () => this.countryNames.set(new Map()),
      });
  }

  private applyMetadata(project: ProjectDetail): void {
    const og = project.ogMeta;

    this.title.setTitle(og.ogTitle);
    this.meta.updateTag({ name: 'description', content: og.ogDescription });
    this.meta.updateTag({ property: 'og:title', content: og.ogTitle });
    this.meta.updateTag({ property: 'og:description', content: og.ogDescription });
    this.meta.updateTag({ property: 'og:url', content: og.ogUrl });

    if (og.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: og.ogImage });
    }
  }
}
