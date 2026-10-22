import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);

  readonly loading      = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue()).subscribe({
      next: (tokens) => {
        this.authStore.setTokens(tokens.accessToken, tokens.refreshToken);

        // Le profil n'est pas indispensable pour être connecté : on le charge
        // en arrière-plan et on navigue, même s'il échoue.
        this.authService.getMe().subscribe({
          next: (user) => {
            this.authStore.setUser(user);
            this.router.navigateByUrl(this.returnUrl());
          },
          error: () => {
            this.authStore.setUser(null);
            this.router.navigateByUrl(this.returnUrl());
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
  }

  loginWithGithub(): void {
    this.authService.loginWithGithub();
  }

  /** Page d'origine demandée par `authGuard`, en repli sur le forum. */
  private returnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    // Un chemin relatif uniquement : jamais de redirection vers un site externe.
    return returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/forum';
  }
}
