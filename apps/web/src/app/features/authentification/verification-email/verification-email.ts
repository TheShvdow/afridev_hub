import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { OtpInputs } from '../components/otp-inputs/otp-inputs';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

/**
 * Confirmation de l'adresse e-mail.
 *
 * `POST /api/auth/verify-email` est protégé par `JwtAuthGuard` et attend un
 * corps `{ code }` : l'utilisateur est déjà authentifié (l'inscription lui a
 * renvoyé ses tokens) et saisit le code reçu par e-mail.
 */
@Component({
  selector: 'app-verification-email',
  standalone: true,
  imports: [
    Icon,
    AuthClose,
    AuthLayout,
    AuthSide,
    OtpInputs,
    RouterLink,
  ],
  templateUrl: './verification-email.html',
  styleUrl: './verification-email.css',
})
export class VerificationEmail implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);

  readonly email = signal('');

  readonly code         = signal('');
  readonly status       = signal<'pending' | 'success'>('pending');
  readonly loading      = signal(false);
  readonly resending    = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage  = signal<string | null>(null);

  readonly steps: AuthStep[] = [
    {
      number: '01',
      title: 'Créer votre compte',
      description: 'Vos coordonnées de responsable',
      state: 'done',
    },
    {
      number: '02',
      title: 'Vérifier votre e-mail',
      description: 'Un code à 6 caractères, valable 24 heures',
      state: 'active',
    },
  ];

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');

    this.email.set(email ?? this.authStore.currentUser()?.email ?? '');
  }

  onCode(code: string): void {
    this.code.set(code);
    this.errorMessage.set(null);
  }

  submit(): void {
    const code = this.code().trim().toUpperCase();

    if (code.length !== 6) {
      this.errorMessage.set('Saisissez les 6 caractères du code reçu par e-mail.');
      return;
    }

    if (!this.authStore.accessToken()) {
      this.errorMessage.set('Votre session a expiré. Reconnectez-vous pour confirmer votre e-mail.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.verifyEmail(code).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.status.set('success');
        this.infoMessage.set(res.message || 'E-mail vérifié avec succès.');

        // Le profil est rafraîchi pour refléter `isVerified = true`.
        this.authService.getMe().subscribe({
          next: (user) => this.authStore.setUser(user),
          error: () => undefined,
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
  }

  resend(): void {
    if (!this.authStore.accessToken()) {
      this.errorMessage.set('Connectez-vous pour recevoir un nouveau code.');
      return;
    }

    this.resending.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.resendVerification().subscribe({
      next: (res) => {
        this.resending.set(false);
        this.infoMessage.set(res.message || 'Nouveau code envoyé par e-mail.');
      },
      error: (err) => {
        this.resending.set(false);
        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
  }

  goForum(): void {
    this.router.navigateByUrl('/forum');
  }
}
