import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardThreadComponent, Thread } from '../../../../shared/components/card-thread/card-thread.component';
import { ForumFiltersComponent } from '../../../../shared/components/forum-filters/forum-filters.component';
import { ThreadModalComponent } from '../../../../shared/components/thread-modal/thread-modal.component';
import { ALL_TAGS } from '../../../../shared/data/threads.data';
import { mapPostToThread } from '../../../../shared/utils/forum-thread.mapper';
import { ForumService } from '../../../../core/services/forum.service';

const FETCH_LIMIT = 20;
const DISPLAY_LIMIT = 4;

@Component({
  selector: 'app-forum',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardThreadComponent, ForumFiltersComponent, ThreadModalComponent],
  templateUrl: './forum.html',
  styleUrl: './forum.css',
})
export class Forum implements OnInit {
  private readonly forum = inject(ForumService);
  private readonly destroyRef = inject(DestroyRef);

  readonly threads = signal<Thread[]>([]);
  readonly selectedTag = signal(ALL_TAGS);
  readonly selectedThread = signal<Thread | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  readonly tags = computed(() => [
    ALL_TAGS,
    ...new Set(this.threads().flatMap((thread) => thread.tags)),
  ]);

  readonly filteredThreads = computed(() => {
    const tag = this.selectedTag();
    const threads =
      tag === ALL_TAGS
        ? this.threads()
        : this.threads().filter((thread) => thread.tags.includes(tag));

    return threads.slice(0, DISPLAY_LIMIT);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.forum
      .listPosts({ page: 1, limit: FETCH_LIMIT, sort: 'active' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.threads.set(response.data.map(mapPostToThread));
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  openThread(thread: Thread): void {
    this.selectedThread.set(thread);
  }

  closeThread(): void {
    this.selectedThread.set(null);
  }
}
