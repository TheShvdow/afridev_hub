import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardProjet, Project } from '../../../../shared/components/card-project/card-projet';
import { ProjectListItem, ProjectsService } from '../../../../core/services/projects.service';
import { CountriesService, Country } from '../../../../core/services/countries.service';
import { mapProjectToCard } from '../../../../shared/utils/project-card.mapper';

const FETCH_LIMIT = 20;
const DISPLAY_LIMIT = 3;

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardProjet],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly countriesService = inject(CountriesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rawProjects = signal<ProjectListItem[]>([]);
  readonly countries = signal<Country[]>([]);
  readonly selectedTag = signal('Tout');

  readonly loading = signal(true);
  readonly error = signal(false);

  private readonly countryNames = computed(
    () => new Map(this.countries().map((country) => [country.code, country.name])),
  );

  readonly projects = computed<Project[]>(() => {
    const countryNames = this.countryNames();
    return this.rawProjects().map((project, index) =>
      mapProjectToCard(project, index, countryNames),
    );
  });

  readonly tags = computed(() => [
    'Tout',
    ...new Set(this.projects().flatMap((project) => project.tags)),
  ]);

  readonly filteredProjects = computed(() => {
    const tag = this.selectedTag();
    const projects =
      tag === 'Tout'
        ? this.projects()
        : this.projects().filter((project) => project.tags.includes(tag));

    return projects.slice(0, DISPLAY_LIMIT);
  });

  ngOnInit(): void {
    this.loadCountries();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.projectsService
      .listProjects({ page: 1, limit: FETCH_LIMIT, sort: 'popular' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.rawProjects.set(response.data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  toggleTag(tag: string): void {
    this.selectedTag.set(tag);
  }

  private loadCountries(): void {
    this.countriesService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (countries) => this.countries.set(countries),
        error: () => this.countries.set([]),
      });
  }
}
