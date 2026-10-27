import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated, PaginationMeta } from './forum.service';

export type NotificationType =
  | 'NEW_ANSWER'
  | 'ANSWER_ACCEPTED'
  | 'VOTE_RECEIVED'
  | 'MENTION'
  | 'REPORT_RESOLVED'
  | 'JOB_ALERT'
  | 'JOB_APPLICATION'
  | 'JOB_REVIEWED'
  | 'SYSTEM'
  | 'BADGE_AWARDED';

/** Notification de `GET /api/notifications`. `link` est absent des notifications antérieures à la colonne. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string | null;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
}

export interface NotificationsMeta extends PaginationMeta {
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  /** `GET /api/notifications` — les plus récentes d'abord. */
  list(page = 1, limit = 20): Observable<Omit<Paginated<AppNotification>, 'meta'> & { meta: NotificationsMeta }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<Omit<Paginated<AppNotification>, 'meta'> & { meta: NotificationsMeta }>(this.base, { params });
  }

  /** `GET /api/notifications/unread-count` */
  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  /** `PATCH /api/notifications/{id}/read` (204) */
  markAsRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${encodeURIComponent(id)}/read`, {});
  }

  /** `PATCH /api/notifications/read-all` (204) */
  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.base}/read-all`, {});
  }
}
