import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from './forum.service';

export type UserRole = 'MEMBER' | 'MODERATOR' | 'ADMIN';

export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: 'MEMBER', label: 'Membre' },
  { value: 'MODERATOR', label: 'Modérateur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

/** Utilisateur de `GET /api/admin/users` ; `isBanned` est déduit de la dernière action de modération sur le compte. */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  isBanned?: boolean;
  reputation: number;
  createdAt: string;
  lastSeenAt: string | null;
}

export interface ForumStats {
  questions: number;
  questionsWithAnswer: number;
  questionsWithAcceptedAnswer: number;
  /** Pourcentage arrondi. */
  acceptedAnswerRate: number;
}

/** `GET /api/admin/stats` — chiffres du tableau de bord et indicateurs SM-2 à SM-7. */
export interface AdminStats {
  users: { total: number; newThisWeek: number };
  content: { posts: number; projects: number; jobs: number };
  projects: { visible: number; withGithubStats: number };
  moderation: { pendingReports: number };
  revenue: { totalCommission: number; capturedPayments: number };
  forum: ForumStats & { last30Days: ForumStats };
  jobs: { published: number; publishedLast60Days: number; pendingReview: number };
}

/** Entrée de `GET /api/admin/audit-log`. */
export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null } | null;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  /** `GET /api/admin/users` — 30 par page, recherche sur le pseudo et l'e-mail. */
  listUsers(page = 1, search?: string): Observable<Paginated<AdminUser>> {
    let params = new HttpParams().set('page', page);
    if (search) params = params.set('search', search);
    return this.http.get<Paginated<AdminUser>>(`${this.base}/users`, { params });
  }

  /** `PATCH /api/admin/users/{id}/role` */
  updateRole(id: string, role: UserRole): Observable<unknown> {
    return this.http.patch(`${this.base}/users/${encodeURIComponent(id)}/role`, { role });
  }

  /** `GET /api/admin/audit-log` — 50 par page. */
  auditLog(page = 1): Observable<Paginated<AuditEntry>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<Paginated<AuditEntry>>(`${this.base}/audit-log`, { params });
  }

  /** `GET /api/admin/stats` */
  stats(): Observable<AdminStats> {
    return this.http.get<AdminStats>(`${this.base}/stats`);
  }
}
