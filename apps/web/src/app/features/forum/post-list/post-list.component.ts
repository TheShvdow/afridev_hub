import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardThreadComponent, Thread } from '../../../shared/components/card-thread/card-thread.component';
import { ForumFiltersComponent } from '../../../shared/components/forum-filters/forum-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ThreadModalComponent } from '../../../shared/components/thread-modal/thread-modal.component';
import { ALL_TAGS, filterThreads, THREADS, THREAD_TAGS } from '../../../shared/data/threads.data';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [RouterLink, CardThreadComponent, ForumFiltersComponent, PageHeroComponent, ThreadModalComponent],
  templateUrl: './post-list.component.html',
  styleUrl: './post-list.component.css',
})
export class PostListComponent {
  readonly threads: Thread[] = THREADS;

  readonly tags = THREAD_TAGS;

  readonly selectedTag = signal(ALL_TAGS);
  readonly selectedThread = signal<Thread | null>(null);

  readonly filteredThreads = computed(() => filterThreads(this.threads, this.selectedTag()));

  openThread(thread: Thread): void {
    this.selectedThread.set(thread);
  }

  closeThread(): void {
    this.selectedThread.set(null);
  }
}
