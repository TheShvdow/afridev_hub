import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { CardThreadComponent, Thread } from '../../../shared/components/card-thread/card-thread.component';
import { ForumFiltersComponent } from '../../../shared/components/forum-filters/forum-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ThreadModalComponent } from '../../../shared/components/thread-modal/thread-modal.component';
import { ALL_TAGS } from '../../../shared/data/threads.data';
import { mapPostToThread } from '../../../shared/utils/forum-thread.mapper';
import { ForumService } from '../../../core/services/forum.service';

const PAGE_SIZE = 20;
const SEARCH_PAUSE_MS = 350;
const MAX_SEARCH_LENGTH = 100;

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [RouterLink, CardThreadComponent, ForumFiltersComponent, PageHeroComponent, ThreadModalComponent],
  templateUrl: './post-list.component.html',
})
export class PostListComponent implements OnInit {
  private readonly forum = inject(ForumService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly threads = signal<Thread[]>([]);
  readonly selectedTag = signal(ALL_TAGS);
  readonly selectedThread = signal<Thread | null>(null);
  /** Texte tapé dans le champ de recherche. */
  readonly search = signal('');
  /** Texte réellement envoyé à l'API (après la pause de saisie). */
  readonly appliedSearch = signal('');
  private readonly typed$ = new Subject<string>();

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal(false);

  private readonly page = signal(1);
  private readonly totalPages = signal(1);
  private readonly knownTags = signal<string[]>([]);
  private requestId = 0;

  readonly tags = computed(() => [ALL_TAGS, ...this.knownTags()]);
  readonly hasMore = computed(() => this.page() < this.totalPages());

  ngOnInit(): void {
    // La recherche et le tag sont dans l'adresse : une page filtrée se partage et survit à un rechargement.
    const params = this.route.snapshot.queryParamMap;
    const query = (params.get('q') ?? '').trim().slice(0, MAX_SEARCH_LENGTH);
    const tag = params.get('tag');
    if (query) {
      this.search.set(query);
      this.appliedSearch.set(query);
    }
    if (tag) this.selectedTag.set(tag);

    // Une pause de saisie avant d'interroger l'API : pas un appel par touche.
    this.typed$
      .pipe(debounceTime(SEARCH_PAUSE_MS), map((value) => value.trim()), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.applySearch(value));

    this.loadFirstPage();
  }

  onSearchInput(value: string): void {
    this.search.set(value);
    this.typed$.next(value);
  }

  /** Entrée dans le champ : on n'attend pas la pause. */
  submitSearch(): void {
    this.applySearch(this.search().trim());
  }

  clearSearch(): void {
    this.search.set('');
    this.applySearch('');
  }

  selectTag(tag: string): void {
    if (tag === this.selectedTag()) return;
    this.selectedTag.set(tag);
    this.syncUrl();
    this.loadFirstPage();
  }

  private applySearch(value: string): void {
    // Un seul caractère ne cherche rien d'utile : on attend le deuxième.
    if (value.length === 1) return;
    const next = value.slice(0, MAX_SEARCH_LENGTH);
    if (next === this.appliedSearch()) return;

    this.appliedSearch.set(next);
    this.syncUrl();
    this.loadFirstPage();
  }

  private syncUrl(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: this.appliedSearch() || null, tag: this.tagFilter() ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  reload(): void {
    this.loadFirstPage();
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;

    const page = this.page() + 1;
    const requestId = this.requestId;
    this.loadingMore.set(true);

    this.forum
      .listPosts({ page, limit: PAGE_SIZE, sort: 'newest', tag: this.tagFilter(), search: this.appliedSearch() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;
          this.threads.update((threads) => [...threads, ...response.data.map(mapPostToThread)]);
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

  openThread(thread: Thread): void {
    this.selectedThread.set(thread);
  }

  /** Reprend dans la carte le score modifié par un vote dans la fenêtre, sans recharger la liste. */
  updateScore({ id, score }: { id: string; score: number }): void {
    this.threads.update((threads) =>
      threads.map((thread) => (thread.id === id && thread.votes !== String(score) ? { ...thread, votes: String(score) } : thread)),
    );
  }

  closeThread(): void {
    this.selectedThread.set(null);
  }

  private loadFirstPage(): void {
    const requestId = ++this.requestId;
    const tag = this.tagFilter();

    this.loading.set(true);
    this.loadingMore.set(false);
    this.error.set(false);

    this.forum
      .listPosts({ page: 1, limit: PAGE_SIZE, sort: 'newest', tag, search: this.appliedSearch() || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;

          const threads = response.data.map(mapPostToThread);
          this.threads.set(threads);
          this.page.set(response.meta.page);
          this.totalPages.set(response.meta.totalPages);
          this.loading.set(false);

          // Les tags proposés viennent de la liste complète : pas d'une recherche, qui les réduirait.
          if (!tag && !this.appliedSearch()) {
            this.knownTags.set([...new Set(threads.flatMap((thread) => thread.tags))]);
          }
        },
        error: () => {
          if (requestId !== this.requestId) return;
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  private tagFilter(): string | undefined {
    const tag = this.selectedTag();
    return tag === ALL_TAGS ? undefined : tag;
  }
}
