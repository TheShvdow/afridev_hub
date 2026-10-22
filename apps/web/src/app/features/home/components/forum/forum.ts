import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardThreadComponent, Thread } from '../../../../shared/components/card-thread/card-thread.component';
import { ForumFiltersComponent } from '../../../../shared/components/forum-filters/forum-filters.component';
import { ThreadModalComponent } from '../../../../shared/components/thread-modal/thread-modal.component';
import { ALL_TAGS, filterThreads, THREADS, THREAD_TAGS } from '../../../../shared/data/threads.data';

@Component({
  selector: 'app-forum',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardThreadComponent, ForumFiltersComponent, ThreadModalComponent],
  templateUrl: './forum.html',
  styleUrl: './forum.css',
})
export class Forum {
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
