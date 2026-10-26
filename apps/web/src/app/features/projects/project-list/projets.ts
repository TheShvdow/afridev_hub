import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CardProjet, Project } from '../../../shared/components/card-project/card-projet';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import {
  ListProjectsQuery,
  ProjectCategory,
  ProjectListItem,
  ProjectSort,
  ProjectsService,
} from '../../../core/services/projects.service';
import { CountriesService, Country } from '../../../core/services/countries.service';
import { mapProjectToCard } from '../../../shared/utils/project-card.mapper';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-projets',
  standalone: true,
  imports: [CardProjet, PageHeroComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './projets.html',
  styleUrl: './projets.css',
})
export class Projets implements OnInit {
  private readonly projectsService = inject(ProjectsService);
  private readonly countriesService = inject(CountriesService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rawProjects = signal<ProjectListItem[]>([]);
  readonly categories = signal<ProjectCategory[]>([]);
  readonly countries = signal<Country[]>([]);

  readonly selectedCategory = signal('');
  readonly selectedCountry = signal('');
  readonly selectedSort = signal<ProjectSort>('newest');
  readonly stacks = signal<string[]>([]);
  readonly stackDraft = signal('');
  readonly searchTerm = signal('');

  readonly search = new FormControl('', { nonNullable: true });

  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal(false);

  private readonly page = signal(1);
  private readonly totalPages = signal(1);
  private requestId = 0;

  private readonly countryNames = computed(
    () => new Map(this.countries().map((country) => [country.code, country.name])),
  );

  readonly projects = computed<Project[]>(() => {
    const countryNames = this.countryNames();
    return this.rawProjects().map((project, index) =>
      mapProjectToCard(project, index, countryNames),
    );
  });

  readonly hasMore = computed(() => this.page() < this.totalPages());
  readonly hasFilters = computed(
    () =>
      !!this.selectedCategory() ||
      !!this.selectedCountry() ||
      this.selectedSort() !== 'newest' ||
      this.stacks().length > 0 ||
      !!this.searchTerm(),
  );

  constructor() {
    this.search.valueChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value.trim());
        this.loadFirstPage();
      });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadCountries();
    this.loadFirstPage();
  }

  selectCategory(slug: string): void {
    if (slug === this.selectedCategory()) return;
    this.selectedCategory.set(slug);
    this.loadFirstPage();
  }

  selectCountry(code: string): void {
    if (code === this.selectedCountry()) return;
    this.selectedCountry.set(code);
    this.loadFirstPage();
  }

  selectSort(sort: ProjectSort): void {
    if (sort === this.selectedSort()) return;
    this.selectedSort.set(sort);
    this.loadFirstPage();
  }

  addStack(raw?: string): void {
    const candidates = (raw ?? this.stackDraft())
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    if (candidates.length === 0) return;

    this.stacks.update((stacks) => [...new Set([...stacks, ...candidates])]);
    this.stackDraft.set('');
    this.loadFirstPage();
  }

  onStackKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.addStack();
  }

  removeStack(slug: string): void {
    this.stacks.update((stacks) => stacks.filter((item) => item !== slug));
    this.loadFirstPage();
  }

  resetFilters(): void {
    this.selectedCategory.set('');
    this.selectedCountry.set('');
    this.selectedSort.set('newest');
    this.stacks.set([]);
    this.stackDraft.set('');
    this.search.setValue('');
    this.searchTerm.set('');
    this.loadFirstPage();
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;

    const page = this.page() + 1;
    const requestId = this.requestId;
    this.loadingMore.set(true);

    this.projectsService
      .listProjects(this.query(page))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;

          this.rawProjects.update((projects) => [...projects, ...response.data]);
          this.page.set(response.meta.page);
          this.totalPages.set(response.meta.totalPages);
          this.loadingMore.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.loadingMore.set(false);
        },
      });
  }

  retry(): void {
    this.loadFirstPage();
  }

  private loadCategories(): void {
    this.projectsService
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (categories) => this.categories.set(categories),
        error: () => this.categories.set([]),
      });
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

  private loadFirstPage(): void {
    const requestId = ++this.requestId;

    this.loading.set(true);
    this.loadingMore.set(false);
    this.error.set(false);

    this.projectsService
      .listProjects(this.query(1))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;

          this.rawProjects.set(response.data);
          this.page.set(response.meta.page);
          this.totalPages.set(response.meta.totalPages);
          this.loading.set(false);
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private query(page: number): ListProjectsQuery {
    return {
      page,
      limit: PAGE_SIZE,
      category: this.selectedCategory() || undefined,
      stack: this.stacks(),
      country: this.selectedCountry() || undefined,
      sort: this.selectedSort(),
      search: this.searchTerm() || undefined,
    };
  }
}
