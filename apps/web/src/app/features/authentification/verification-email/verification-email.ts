import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { OtpInputs } from '../components/otp-inputs/otp-inputs';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorCode, extractApiErrorMessage } from '../../../core/utils/api-error';

/**
 * Confirmation de l'adresse e-mail.
 *
 * `POST /api/auth/verify-email` est public et attend `{ email, code }` :
 * l'utilisateur n'a pas encore de session, puisque la connexion est bloquée
 * tant que l'adresse n'est pas confirmée. L'email vient de la query string
 * (`?email=…`), posée par l'inscription, la connexion ou le callback OAuth.
 */
@Component({
  selector: 'app-verification-email',
  standalone: true,
  imports: [
    // Fournit `ngSubmit` : sans lui, le formulaire part en GET natif et l'URL perd `?email=…`.
    FormsModule,
    Icon,
    AuthClose,
    AuthLayout,
    AuthSide,
    OtpInputs,
    RouterLink,
  ],
  templateUrl: './verification-email.html',
})
export class VerificationEmail implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
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
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
  }

  onCode(code: string): void {
    this.code.set(code);
    this.errorMessage.set(null);
  }

  submit(): void {
    const code = this.code().trim().toUpperCase();
    const email = this.email().trim();

    if (code.length !== 6) {
      this.errorMessage.set('Saisissez les 6 caractères du code reçu par e-mail.');
      return;
    }

    if (!email) {
      this.errorMessage.set(
        'Adresse e-mail manquante : revenez à la connexion pour recommencer.'
      );
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.verifyEmail(email, code).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.status.set('success');
        this.infoMessage.set(res.message || 'E-mail vérifié avec succès.');
      },
      error: (err) => {
        this.loading.set(false);

        // Compte déjà confirmé (code saisi deux fois, autre onglet) : c'est un
        // succès du point de vue de l'utilisateur, on le renvoie vers la connexion.
        if (extractApiErrorCode(err) === 'AUTH_ALREADY_VERIFIED') {
          this.status.set('success');
          this.infoMessage.set('Cet e-mail est déjà vérifié. Vous pouvez vous connecter.');
          return;
        }

        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
  }

  resend(): void {
    const email = this.email().trim();

    if (!email) {
      this.errorMessage.set(
        'Adresse e-mail manquante : revenez à la connexion pour recommencer.'
      );
      return;
    }

    this.resending.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.resendVerification(email).subscribe({
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

  /** La vérification ne connecte pas : on renvoie vers le formulaire de connexion. */
  goLogin(): void {
    this.router.navigate(['/auth/login'], {
      queryParams: this.email() ? { email: this.email() } : {},
    });
  }
}
