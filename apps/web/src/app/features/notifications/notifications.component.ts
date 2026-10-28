import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { AppNotification, NotificationsService } from '../../core/services/notifications.service';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { notificationLink } from '../../core/utils/notification-view';
import { relativeTime } from '../../shared/utils/forum-thread.mapper';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [PageHeroComponent],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent {
  private readonly api = inject(NotificationsService);
  private readonly router = inject(Router);

  readonly items = signal<AppNotification[]>([]);
  readonly unreadCount = signal(0);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private page = 1;

  constructor() {
    this.load(1);
  }

  retry(): void {
    this.load(1);
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) return;
    this.load(this.page + 1);
  }

  open(notification: AppNotification): void {
    this.markRead(notification);

    const link = notificationLink(notification);
    if (link) void this.router.navigateByUrl(link);
  }

  markAllAsRead(): void {
    this.api.markAllAsRead().subscribe({
      next: () => {
        this.items.update((list) => list.map((item) => ({ ...item, isRead: true })));
        this.unreadCount.set(0);
      },
      error: (error) => this.errorMessage.set(extractApiErrorMessage(error)),
    });
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }

  private markRead(notification: AppNotification): void {
    if (notification.isRead) return;

    this.api.markAsRead(notification.id).subscribe({
      next: () => {
        this.items.update((list) => list.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
        this.unreadCount.update((count) => Math.max(0, count - 1));
      },
      // Lecture non enregistrée : la notification reste non lue, sans bloquer la navigation.
      error: () => undefined,
    });
  }

  private load(page: number): void {
    const append = page > 1;
    (append ? this.loadingMore : this.loading).set(true);
    this.errorMessage.set(null);

    this.api.list(page, PAGE_SIZE).subscribe({
      next: ({ data, meta }) => {
        this.page = page;
        this.items.update((current) => (append ? [...current, ...data] : data));
        this.unreadCount.set(meta.unreadCount);
        this.hasMore.set(meta.page < meta.totalPages);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.loadingMore.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
