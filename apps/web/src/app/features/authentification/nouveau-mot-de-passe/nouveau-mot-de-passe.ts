import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthPasswordField } from '../components/auth-password-field/auth-password-field';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { OtpInputs } from '../components/otp-inputs/otp-inputs';
import { PasswordStrength } from '../components/password-strength/password-strength';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { passwordRulesValidator, sameAsValidator } from '../../../core/utils/password-rules';

/**
 * Deuxième étape : le code reçu par e-mail et le nouveau mot de passe. L'adresse vient de l'étape
 * précédente (`?email=…`). À la réussite, toutes les sessions du compte sont fermées côté API.
 */
@Component({
  selector: 'app-nouveau-mot-de-passe',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AuthClose, AuthLayout, AuthPasswordField, AuthSide, OtpInputs, PasswordStrength],
  templateUrl: './nouveau-mot-de-passe.html',
})
export class NouveauMotDePasse implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly email = signal('');
  readonly code = signal('');
  readonly status = signal<'pending' | 'success'>('pending');
  readonly loading = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);

  readonly steps: AuthStep[] = [
    { number: '01', title: 'Demander un code', description: 'Envoyé à l’adresse de ton compte', state: 'done' },
    { number: '02', title: 'Choisir un nouveau mot de passe', description: 'Le code est valable 30 minutes', state: 'active' },
  ];

  readonly form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, passwordRulesValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: sameAsValidator('password', 'confirm') },
  );

  ngOnInit(): void {
    this.email.set(this.route.snapshot.queryParamMap.get('email') ?? '');
  }

  onCode(code: string): void {
    this.code.set(code);
    this.errorMessage.set(null);
  }

  submit(): void {
    if (this.loading()) return;

    const email = this.email().trim();
    const code = this.code().trim().toUpperCase();

    if (!email) {
      this.errorMessage.set('Adresse e-mail manquante : recommence depuis « Mot de passe oublié ».');
      return;
    }
    if (code.length !== 6) {
      this.errorMessage.set('Saisis les 6 caractères du code reçu par e-mail.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.resetPassword(email, code, this.form.controls.password.value).subscribe({
      next: () => {
        this.loading.set(false);
        this.status.set('success');
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }

  resend(): void {
    const email = this.email().trim();
    if (!email || this.resending()) return;

    this.resending.set(true);
    this.errorMessage.set(null);
    this.infoMessage.set(null);

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.infoMessage.set('Si ton compte existe, un nouveau code vient d’être envoyé.');
      },
      error: (error) => {
        this.resending.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }

  goLogin(): void {
    void this.router.navigate(['/auth/login'], { queryParams: { email: this.email() } });
  }
}
