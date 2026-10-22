import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, catchError, from, of } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { SILENT_ERROR } from '../interceptors/silent-error';
import type {
  LoginDto,
  RegisterDto,
  AuthTokens,
  AuthMessageResponse,
  UserMe,
} from '@afridev/shared-types';

/**
 * Corps attendu par `POST /api/auth/verify-email` : le code à 6 caractères
 * alphanumériques envoyé par e-mail (majuscules et chiffres).
 */
export interface VerifyEmailCodeDto {
  code: string;
}

/**
 * Les réponses sont dépouillées de leur enveloppe `{ data }` par
 * `envelopeInterceptor` : le service reçoit directement le payload utile.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly base = `${environment.apiUrl}/auth`;

  /**
   * URL de démarrage du flux OAuth GitHub : l'API y répond par une redirection
   * (302) vers la page d'autorisation de GitHub. Le retour de GitHub est
   * traité par `GET /api/auth/github/callback`, qui renvoie les tokens dans le
   * fragment de l'URL (`#at=…&rt=…`) à l'adresse de l'application.
   */
  readonly githubAuthUrl = `${environment.apiUrl}/auth/github`;

  /** URL de démarrage du flux OAuth Google (même mécanisme que GitHub). */
  readonly googleAuthUrl = `${environment.apiUrl}/auth/google`;

  /** `POST /api/auth/login` — l'API n'accepte qu'un e-mail (pas de nom d'utilisateur). */
  login(dto: LoginDto): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/login`, dto);
  }

  /** `POST /api/auth/register` — l'API n'accepte que `username`, `email` et `password`. */
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

  /**
   * Confirme l'adresse e-mail avec le code reçu.
   * La route est protégée par `JwtAuthGuard` : l'utilisateur est authentifié
   * (l'inscription renvoie déjà les tokens).
   */
  verifyEmail(code: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/verify-email`, { code });
  }

  /**
   * Déclenche la vérification d'e-mail juste après l'inscription.
   *
   * L'API expédie déjà le code par e-mail depuis `POST /api/auth/register` :
   * cet appel confirme la route de vérification qui porte le parcours et met à
   * jour l'état du compte côté API. L'API exige le code dans le corps de la
   * requête : un refus est attendu et silencieux (le code a bien été expédié
   * par l'inscription), l'appel ne doit donc pas déclencher de toast.
   */
  verifyEmailOnSignup(): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(
      `${this.base}/verify-email`,
      {},
      { context: new HttpContext().set(SILENT_ERROR, true) }
    );
  }

  /** Renvoie l'email de vérification (nécessite d'être authentifié). */
  resendVerification(): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/resend-verification`, {});
  }

  /**
   * Déconnecte la session courante et révoque son refresh token.
   * Le jeton d'accès est passé explicitement : la session peut déjà avoir été
   * purgée du store au moment de l'appel.
   */
  logout(accessToken?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {}, this.authHeaders(accessToken));
  }

  /** Déconnecte toutes les sessions de l'utilisateur. */
  logoutAll(accessToken?: string): Observable<void> {
    return this.http.post<void>(`${this.base}/logout-all`, {}, this.authHeaders(accessToken));
  }

  getMe(): Observable<UserMe> {
    return this.http.get<UserMe>(`${this.base}/me`);
  }

  /** Lie un compte OAuth (GitHub/Google) à un compte existant, mot de passe requis. */
  linkOAuthAccount(linkToken: string, password: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/oauth/link`, { linkToken, password });
  }

  /**
   * Lance le flux OAuth : redirige le navigateur vers la page d'autorisation
   * du fournisseur.
   *
   * La route de l'API est appelée une première fois pour vérifier qu'elle
   * répond : une API qui ne connaît pas le fournisseur (identifiants OAuth
   * absents, route inconnue) renvoie un JSON d'erreur, qu'il vaut mieux
   * signaler dans l'application plutôt que laisser le navigateur afficher une
   * page JSON brute.
   *
   * Renvoie `true` quand la redirection est lancée.
   */
  startOAuth(url: string): Observable<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return of(false);
    }

    return from(
      fetch(url, { redirect: 'manual', credentials: 'include' }).then((response) => {
        // Une réponse opaque (ou un code d'erreur) signifie que l'API n'a
        // pas redirigé vers le fournisseur.
        if (response.type === 'opaque' || response.status >= 400) {
          return false;
        }

        window.location.href = url;
        return true;
      })
    ).pipe(
      catchError(() => {
        // API injoignable : on tente quand même la redirection, le navigateur
        // affichera le diagnostic (ERR_CONNECTION_REFUSED).
        window.location.href = url;
        return of(true);
      })
    );
  }

  loginWithGithub(): Observable<boolean> {
    return this.startOAuth(this.githubAuthUrl);
  }

  loginWithGoogle(): Observable<boolean> {
    return this.startOAuth(this.googleAuthUrl);
  }

  private authHeaders(accessToken?: string): { headers?: { Authorization: string } } | undefined {
    return accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined;
  }
}
