import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { OtpInputs } from '../components/otp-inputs/otp-inputs';

@Component({
  selector: 'app-verification-email',
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
export class VerificationEmail {
  private readonly router = inject(Router);

  readonly email = 'votre@exemple.com';

  readonly code = signal('');
  readonly invalid = signal(false);

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
      description: 'Un code à 6 chiffres, valable 10 minutes',
      state: 'active',
    },
  ];

  onCode(code: string): void {
    this.code.set(code);
    this.invalid.set(false);
  }

  submit(): void {
    if (this.code().length !== 6) {
      this.invalid.set(true);
      return;
    }

    this.router.navigate(['/']);
  }

  resend(): void {
    this.invalid.set(false);
  }
}
