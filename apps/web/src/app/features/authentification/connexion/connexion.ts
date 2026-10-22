import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthField } from '../components/auth-field/auth-field';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthPasswordField } from '../components/auth-password-field/auth-password-field';
import { AuthSide, AuthFeature } from '../components/auth-side/auth-side';
import { SocialAuth } from '../components/social-auth/social-auth';

@Component({
  selector: 'app-connexion',
  imports: [
    Icon,
    AuthClose,
    AuthField,
    AuthLayout,
    AuthPasswordField,
    AuthSide,
    SocialAuth,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly features: AuthFeature[] = [
    { icon: 'folder', title: 'Projets :', description: 'trouve une équipe et construis du concret' },
    { icon: 'mentor', title: 'Mentorat :', description: 'trouve une équipe et construis du concret' },
    { icon: 'community', title: 'Communauté :', description: 'trouve une équipe et construis du concret' },
  ];

  readonly form = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [true],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.router.navigate(['/']);
  }
}
