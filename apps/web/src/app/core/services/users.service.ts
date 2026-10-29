import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Niveau d'expérience déclaré (enum `ExperienceLevel` de l'API). */
export type ExperienceLevel = 'JUNIOR' | 'MID' | 'SENIOR';

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'JUNIOR', label: 'Junior' },
  { value: 'MID', label: 'Confirmé' },
  { value: 'SENIOR', label: 'Senior' },
];

/** Contraintes de `UpdateUserDto.stack` : 10 technologies au plus, 30 caractères chacune. */
export const MAX_STACK_ITEMS = 10;
export const MAX_STACK_ITEM_LENGTH = 30;

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
  level?: ExperienceLevel | null;
  stack?: string[];
  websiteUrl?: string | null;
  githubUsername?: string | null;
  linkedinUsername?: string | null;
  twitterUsername?: string | null;
  /** E-mails d'activité (réponses, votes, candidatures…) ; les e-mails de confirmation (reçu, accusé) partent toujours. */
  emailNotifications?: boolean;
}

/** Sous-ensemble de la réponse de `PATCH /api/users/me` (MyProfileDto). */
export interface MyProfile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  country: string | null;
  level: ExperienceLevel | null;
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
  country: string | null;
  stack: string[];
  level: ExperienceLevel | null;
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

  /** `PATCH /api/users/me/onboarding` — ne remplit que les champs encore vides. */
  completeOnboarding(dto: { location?: string; country?: string; level?: ExperienceLevel; stack?: string[] }): Observable<unknown> {
    return this.http.patch(`${this.base}/me/onboarding`, dto);
  }

  /** `POST /api/users/me/recruiter` — active le profil recruteur (nom de l'entreprise). */
  enableRecruiter(companyName: string): Observable<unknown> {
    return this.http.post(`${this.base}/me/recruiter`, { companyName });
  }

  /** `GET /api/users/{username}` — profil public. */
  getPublicProfile(username: string): Observable<PublicUserProfile> {
    return this.http.get<PublicUserProfile>(
      `${this.base}/${encodeURIComponent(username)}`,
    );
  }
}
