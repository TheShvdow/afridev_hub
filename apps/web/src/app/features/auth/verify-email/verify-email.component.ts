import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { HttpErrorResponse } from '@angular/common/http';

type Status = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);

  readonly status       = signal<Status>('loading');
  readonly message      = signal<string>('');
  readonly errorCode    = signal<string | null>(null);
  readonly canResend    = signal(false);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.status.set('error');
      this.message.set('Lien de vérification invalide.');
      this.errorCode.set('AUTH_VERIFICATION_TOKEN_INVALID');
      this.canResend.set(!!this.authStore.currentUser() || !!this.authStore.accessToken());
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: (res) => {
        this.status.set('success');
        this.message.set(res.message || 'Email vérifié avec succès.');
        this.canResend.set(false);

        // Si l'utilisateur était connecté, on rafraîchit son profil pour
        // refléter isVerified = true immédiatement.
        if (this.authStore.accessToken()) {
          this.authService.getMe().subscribe({
            next: (user) => this.authStore.setUser(user),
            error: () => undefined,
          });
        }
      },
      error: (err: HttpErrorResponse) => {
        this.status.set('error');
        this.message.set(extractApiErrorMessage(err));
        const body = err.error as { error?: { code?: string } } | undefined;
        this.errorCode.set(body?.error?.code ?? null);
        this.canResend.set(!!this.authStore.accessToken());
      },
    });
  }

  resend(): void {
    if (!this.canResend()) return;

    this.authService.resendVerification().subscribe({
      next: (res) => {
        this.status.set('loading');
        this.message.set(res.message || 'Email de vérification renvoyé.');
        this.canResend.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const body = err.error as { error?: { code?: string; message?: string } } | undefined;
        if (body?.error?.code === 'AUTH_ALREADY_VERIFIED') {
          this.status.set('success');
          this.message.set('Cet email est déjà vérifié.');
          this.canResend.set(false);
          if (this.authStore.accessToken()) {
            this.authService.getMe().subscribe({
              next: (user) => this.authStore.setUser(user),
              error: () => undefined,
            });
          }
          return;
        }
        this.message.set(extractApiErrorMessage(err));
      },
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  goForum(): void {
    this.router.navigateByUrl('/forum');
  }

  goLogin(): void {
    this.router.navigateByUrl('/auth/login');
  }
}
