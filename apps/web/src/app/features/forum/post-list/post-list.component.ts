import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { CardThreadComponent, Thread } from '../../../shared/components/card-thread/card-thread.component';
import { ForumFiltersComponent } from '../../../shared/components/forum-filters/forum-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ThreadModalComponent } from '../../../shared/components/thread-modal/thread-modal.component';
import { ALL_TAGS } from '../../../shared/data/threads.data';
import { mapPostToThread } from '../../../shared/utils/forum-thread.mapper';
import { ForumService } from '../../../core/services/forum.service';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [RouterLink, CardThreadComponent, ForumFiltersComponent, PageHeroComponent, ThreadModalComponent],
  templateUrl: './post-list.component.html',
})
export class PostListComponent implements OnInit {
  private readonly forum = inject(ForumService);
  private readonly destroyRef = inject(DestroyRef);

  readonly threads = signal<Thread[]>([]);
  readonly selectedTag = signal(ALL_TAGS);
  readonly selectedThread = signal<Thread | null>(null);

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
    this.loadFirstPage();
  }

  selectTag(tag: string): void {
    if (tag === this.selectedTag()) return;
    this.selectedTag.set(tag);
    this.loadFirstPage();
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
      .listPosts({ page, limit: PAGE_SIZE, sort: 'newest', tag: this.tagFilter() })
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
      .listPosts({ page: 1, limit: PAGE_SIZE, sort: 'newest', tag })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (requestId !== this.requestId) return;

          const threads = response.data.map(mapPostToThread);
          this.threads.set(threads);
          this.page.set(response.meta.page);
          this.totalPages.set(response.meta.totalPages);
          this.loading.set(false);

          if (!tag) {
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
