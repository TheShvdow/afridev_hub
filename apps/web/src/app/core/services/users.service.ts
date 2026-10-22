import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Champs acceptés par `PATCH /api/users/me`.
 * L'API rejette tout champ non déclaré (`forbidNonWhitelisted`) : n'envoyer
 * que les champs réellement renseignés.
 */
export interface UpdateProfileDto {
  displayName?: string;
  bio?: string;
  location?: string;
  stack?: string[];
  websiteUrl?: string;
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
}
