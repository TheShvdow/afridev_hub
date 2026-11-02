import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, of } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import type {
  LoginDto,
  RegisterDto,
  RegisterResponse,
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

  /**
   * `POST /api/auth/register` — l'API n'accepte que `username`, `email` et
   * `password`. Aucun token n'est renvoyé : un code d'activation est expédié
   * et la connexion reste bloquée tant que l'adresse n'est pas confirmée.
   */
  register(dto: RegisterDto): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.base}/register`, dto);
  }

  /**
   * L'API extrait le refresh token du corps de la requête
   * (`ExtractJwt.fromBodyField('refreshToken')`) : il doit être transmis.
   */
  refreshToken(refreshToken: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/refresh`, { refreshToken });
  }

  /**
   * Confirme l'adresse e-mail avec le code reçu. Route publique : le compte
   * n'a pas encore de session, l'email identifie le compte à vérifier.
   */
  verifyEmail(email: string, code: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/verify-email`, { email, code });
  }

  /**
   * Renvoie un code de vérification. Route publique : la réponse est identique
   * que l'email appartienne à un compte non vérifié ou non.
   */
  resendVerification(email: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/resend-verification`, { email });
  }

  /**
   * Demande un code de réinitialisation. Route publique : la réponse est identique que
   * l'adresse ait un compte ou non.
   */
  forgotPassword(email: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/forgot-password`, { email });
  }

  /** Choisit un nouveau mot de passe avec le code reçu. Ferme toutes les sessions du compte. */
  resetPassword(email: string, code: string, newPassword: string): Observable<AuthMessageResponse> {
    return this.http.post<AuthMessageResponse>(`${this.base}/reset-password`, { email, code, newPassword });
  }

  /**
   * Change le mot de passe d'un membre connecté. Les autres appareils sont déconnectés ; la réponse
   * porte les nouveaux jetons de celui-ci, à ranger tout de suite.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/change-password`, { currentPassword, newPassword });
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
