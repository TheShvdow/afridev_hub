import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthPasswordField } from '../components/auth-password-field/auth-password-field';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

/**
 * L'API ne lie jamais un compte OAuth automatiquement : si l'e-mail existe déjà,
 * elle émet un jeton de liaison de 10 minutes et redirige ici. L'utilisateur
 * confirme la liaison avec le mot de passe de son compte existant.
 */
@Component({
  selector: 'app-oauth-link',
  standalone: true,
  imports: [Icon, AuthClose, AuthLayout, AuthPasswordField, ReactiveFormsModule, RouterLink],
  templateUrl: './oauth-link.html',
  styleUrl: './oauth-link.css',
})
export class OauthLink implements OnInit {
  private readonly platformId  = inject(PLATFORM_ID);
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);

  readonly provider     = signal<string | null>(null);
  readonly email        = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly loading      = signal(false);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  /** Jeton de liaison lu dans le fragment, avant son effacement de l'historique. */
  private linkToken: string | null = null;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    this.provider.set(params.get('provider'));
    this.email.set(params.get('email'));
    this.linkToken = params.get('linkToken');

    // Le jeton de liaison ne doit pas rester dans l'URL.
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search
    );
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.linkToken) {
      this.errorMessage.set('Jeton de liaison manquant. Recommencez la connexion.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService
      .linkOAuthAccount(this.linkToken, this.form.getRawValue().password)
      .subscribe({
        next: (tokens) => {
          this.authStore.setTokens(tokens.accessToken, tokens.refreshToken);

          this.authService.getMe().subscribe({
            next: (user) => this.authStore.setUser(user),
            error: () => this.authStore.setUser(null),
          });

          this.router.navigateByUrl('/');
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(extractApiErrorMessage(err));
        },
      });
  }
}
