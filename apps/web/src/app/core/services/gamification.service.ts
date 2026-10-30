import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputation: number;
  location: string | null;
  _count?: {
    posts: number;
    answers: number;
    receivedBadges: number;
  };
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
export class GamificationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/gamification`;

  leaderboard(page = 1, limit = 50): Observable<Paginated<LeaderboardEntry>> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<Paginated<LeaderboardEntry>>(`${this.base}/leaderboard`, { params });
  }

  badges(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/badges`);
  }
}
