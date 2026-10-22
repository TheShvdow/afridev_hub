import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthField } from '../components/auth-field/auth-field';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthPasswordField } from '../components/auth-password-field/auth-password-field';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { PasswordStrength } from '../components/password-strength/password-strength';
import { SocialAuth } from '../components/social-auth/social-auth';

@Component({
  selector: 'app-inscription',
  imports: [
    Icon,
    AuthClose,
    AuthField,
    AuthLayout,
    AuthPasswordField,
    AuthSide,
    PasswordStrength,
    SocialAuth,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './inscription.html',
  styleUrl: './inscription.css',
})
export class Inscription {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly specialities = [
    'Développement web',
    'Applications mobiles',
    'Data & intelligence artificielle',
    'DevOps & Cloud',
    'UI/UX Design',
  ];

  readonly steps: AuthStep[] = [
    {
      number: '01',
      title: 'Créer votre compte',
      description: 'Vos coordonnées de responsable',
      state: 'active',
    },
    {
      number: '02',
      title: 'Vérifier votre e-mail',
      description: 'Un code à 6 chiffres, valable 10 minutes',
      state: 'todo',
    },
  ];

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    speciality: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.router.navigate(['/verification-email']);
  }
}
