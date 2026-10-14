import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type {
  LoginDto,
  RegisterDto,
  AuthTokens,
  UserMe,
} from '@afridev/shared-types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/auth`;

  login(dto: LoginDto): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/login`, dto);
  }

  register(dto: RegisterDto): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/register`, dto);
  }

  refreshToken(): Observable<AuthTokens> {
    return this.http.post<AuthTokens>(`${this.base}/refresh`, {});
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, {});
  }

  getMe(): Observable<UserMe> {
    return this.http.get<UserMe>(`${this.base}/me`);
  }

  loginWithGithub(): void {
    window.location.href = `${environment.apiUrl}/auth/github`;
  }
}
