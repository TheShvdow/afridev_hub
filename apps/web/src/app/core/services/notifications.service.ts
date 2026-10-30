import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: any;
  readAt?: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/notifications`;

  list(page = 1, limit = 20): Observable<Paginated<Notification>> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<Paginated<Notification>>(this.base, { params });
  }

  markAllRead(): Observable<void> {
    return this.http.patch<void>(`${this.base}/read-all`, {});
  }

  markRead(id: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${encodeURIComponent(id)}/read`, {});
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http
      .get<{ data: { count: number } } | { count: number }>(`${this.base}/unread-count`)
      .pipe((res: any) => res);
  }
}
