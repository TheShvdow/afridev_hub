import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService, Notification } from '../../core/services/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css',
})
export class NotificationsComponent implements OnInit {
  private readonly notificationsService = inject(NotificationsService);

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.notificationsService.list(1, 50).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  markAllRead(): void {
    this.notificationsService.markAllRead().subscribe({
      next: () => {
        this.notifications.update((items) => items.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      },
      error: () => {},
    });
  }

  markRead(n: Notification): void {
    if (n.readAt) return;
    this.notificationsService.markRead(n.id).subscribe({
      next: () => {
        this.notifications.update((items) =>
          items.map((item) => (item.id === n.id ? { ...item, readAt: new Date().toISOString() } : item)),
        );
      },
      error: () => {},
    });
  }
}
