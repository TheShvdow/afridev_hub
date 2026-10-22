import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import type {
  LoginDto,
  RegisterDto,
  AuthTokens,
  AuthMessageResponse,
  UserMe,
} from '@afridev/shared-types';

/**
 * Les réponses sont dépouillées de leur enveloppe `{ data }` par
 * `envelopeInterceptor` : le service reçoit directement le payload utile.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = `${environment.apiUrl}/auth`;

  login(dto: LoginDto): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/login`, dto);
  }

  register(dto: RegisterDto): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/register`, dto);
  }

  /**
   * L'API extrait le refresh token du corps de la requête
   * (`ExtractJwt.fromBodyField('refreshToken')`) : il doit être transmis.
   */
  refreshToken(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/refresh`, { refreshToken });
  }

  /** Confirme l'adresse email à partir du jeton reçu dans le lien. */
  verifyEmail(token: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(
      `${this.base}/verify-email`,
      {},
      { params: { token } }
    );
  }

  /** Renvoie l'email de vérification (nécessite d'être authentifié). */
  resendVerification(): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/resend-verification`, {});
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {});
  }

  getMe(): Observable<UserMe> {
    return this.http.get<UserMe>(`${this.base}/me`);
  }

  /** Lie un compte OAuth (GitHub/Google) à un compte existant, mot de passe requis. */
  linkOAuthAccount(linkToken: string, password: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/oauth/link`, { linkToken, password });
  }

  loginWithGithub(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = `${environment.apiUrl}/auth/github`;
    }
  }

  loginWithGoogle(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.location.href = `${environment.apiUrl}/auth/google`;
    }
  }
}
