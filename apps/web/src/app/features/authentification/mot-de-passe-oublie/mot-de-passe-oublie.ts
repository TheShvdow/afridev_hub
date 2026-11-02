import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthField } from '../components/auth-field/auth-field';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { AuthService } from '../../../core/services/auth.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

/**
 * Première étape : l'adresse e-mail du compte. La réponse de l'API est la même que l'adresse ait un
 * compte ou non : on enchaîne toujours sur la saisie du code, sans rien révéler.
 */
@Component({
  selector: 'app-mot-de-passe-oublie',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, AuthClose, AuthField, AuthLayout, AuthSide],
  templateUrl: './mot-de-passe-oublie.html',
})
export class MotDePasseOublie implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly steps: AuthStep[] = [
    { number: '01', title: 'Demander un code', description: 'Il part à l’adresse de ton compte', state: 'active' },
    { number: '02', title: 'Choisir un nouveau mot de passe', description: 'Le code est valable 30 minutes', state: 'todo' },
  ];

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);
  }

  submit(): void {
    if (this.loading()) return;

    // Une adresse collée avec un espace de trop reste valable : on la nettoie avant de la contrôler.
    this.form.controls.email.setValue(this.form.controls.email.value.trim());

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value;
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/auth/reset-password'], { queryParams: { email } });
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
