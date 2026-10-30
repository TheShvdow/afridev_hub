export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  awardedAt: string;
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    condition: string;
    slug: string;
    category: string;
    requiredPoints: number;
  };
}

export interface UserActivity {
  recentPosts: Array<{ id: string; title: string; createdAt: string }>;
  recentAnswers: Array<{ id: string; createdAt: string; isAccepted: boolean; post: { id: string; title: string; createdAt: string } }>;
  recentProjects: Array<{ id: string; slug: string; name: string; createdAt: string }>;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Champs acceptés par `PATCH /api/users/me`.
 * L'API rejette tout champ non déclaré (`forbidNonWhitelisted`) : n'envoyer
 * que les champs réellement renseignés.
 */
export interface UpdateProfileDto {
  displayName?: string | null;
  bio?: string | null;
  location?: string | null;
  country?: string | null;
  level?: string | null;
  stack?: string[];
  websiteUrl?: string | null;
  githubUsername?: string | null;
  linkedinUsername?: string | null;
  twitterUsername?: string | null;
  preferredCurrency?: string | null;
  emailNotifications?: boolean;
}

/** Sous-ensemble de la réponse de `PATCH /api/users/me` (MyProfileDto). */
export interface MyProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  stack: string[];
  reputation: number;
  isVerified: boolean;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  websiteUrl: string | null;
  githubUsername: string | null;
  linkedinUsername: string | null;
  twitterUsername: string | null;
  reputation: number;
  role: string;
  isVerified: boolean;
  createdAt: string;
  _count?: {
    posts: number;
    answers: number;
    projects: number;
    receivedBadges: number;
  };
  ogMeta?: {
    ogTitle: string;
    ogDescription: string;
    ogImage: string | null;
    ogUrl: string;
  };
}

/**
 * Les réponses sont dépouillées de leur enveloppe `{ data }` par
 * `envelopeInterceptor` : le service reçoit directement le payload utile.
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/users`;

  /** `PATCH /api/users/me` — nécessite un jeton d'accès valide. */
  updateProfile(dto: UpdateProfileDto): Observable<MyProfile> {
    return this.http.patch<MyProfile>(`${this.base}/me`, dto);
  }

  /** `GET /api/users/{username}` — profil public. */
  getPublicProfile(username: string): Observable<PublicUserProfile> {
    return this.http.get<PublicUserProfile>(
      `${this.base}/${encodeURIComponent(username)}`,
    );
  }

  getUserActivity(username: string): Observable<UserActivity> {
    return this.http
      .get<{ data: UserActivity } | UserActivity>(`${this.base}/${encodeURIComponent(username)}/activity`)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  getUserBadges(username: string): Observable<UserBadge[]> {
    return this.http
      .get<{ data: UserBadge[] } | UserBadge[]>(`${this.base}/${encodeURIComponent(username)}/badges`)
      .pipe(map((res: any) => (Array.isArray(res) ? res : res?.data || [])));
  }

  becomeRecruiter(companyName: string): Observable<any> {
    return this.http
      .post<{ data: any } | any>(`${this.base}/me/recruiter`, { companyName })
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  completeOnboarding(dto: { location?: string; country?: string; level?: string; stack?: string[] }): Observable<any> {
    return this.http
      .patch<{ data: any } | any>(`${this.base}/me/onboarding`, dto)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  updateAvatar(key: string): Observable<any> {
    return this.http
      .patch<{ data: any } | any>(`${this.base}/me/avatar`, { key })
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }
}
