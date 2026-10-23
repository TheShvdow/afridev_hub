import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthField } from '../components/auth-field/auth-field';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthPasswordField } from '../components/auth-password-field/auth-password-field';
import { AuthSide, AuthFeature } from '../components/auth-side/auth-side';
import { SocialAuth } from '../components/social-auth/social-auth';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorCode, extractApiErrorMessage } from '../../../core/utils/api-error';
import { resolveOAuthErrorMessage } from '../../../core/utils/oauth-error';
import { takeSpeciality } from '../../../core/utils/pending-speciality';

@Component({
  selector: 'app-connexion',
  standalone: true,
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
export class Connexion implements OnInit {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly usersService = inject(UsersService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);
  private readonly route       = inject(ActivatedRoute);
  private readonly platformId  = inject(PLATFORM_ID);

  readonly loading      = signal(false);
  readonly errorMessage = signal<string | null>(null);

  /** La réinitialisation de mot de passe n'est pas encore exposée par l'API. */
  readonly passwordResetUnavailable = signal(false);

  readonly features: AuthFeature[] = [
    { icon: 'folder', title: 'Projets :', description: 'trouve une équipe et lance ton projet' },
    { icon: 'users', title: 'Mentorat :', description: 'progresse avec l’aide de mentors' },
    { icon: 'users', title: 'Communauté :', description: 'échange avec d’autres développeurs' },
  ];

  /**
   * L'API n'accepte qu'une adresse e-mail pour se connecter (`LoginDto.email`) :
   * le champ ne propose donc pas le nom d'utilisateur.
   */
  readonly form = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [true],
  });

  ngOnInit(): void {
    // Retour de la page de vérification : l'email est prérempli.
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);

    if (!isPlatformBrowser(this.platformId)) return;

    // L'API redirige ici quand un callback OAuth échoue : #provider=…&error=…
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const code = params.get('error');
    const description = params.get('error_description');

    if (!code && !description) return;

    // Le fragment ne doit pas rester dans l'URL.
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search
    );

    this.errorMessage.set(resolveOAuthErrorMessage(code, description));
  }

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email, password }).subscribe({
      next: (tokens) => {
        this.authStore.setTokens(tokens.accessToken, tokens.refreshToken, remember);

        // Le profil n'est pas indispensable pour être connecté : on le charge
        // en arrière-plan et on navigue, même s'il échoue.
        this.authService.getMe().subscribe({
          next: (user) => {
            this.authStore.setUser(user);
            this.applyPendingSpeciality();
            this.router.navigateByUrl(this.returnUrl());
          },
          error: () => {
            this.authStore.setUser(null);
            this.applyPendingSpeciality();
            this.router.navigateByUrl(this.returnUrl());
          },
        });
      },
      error: (err) => {
        this.loading.set(false);

        // Adresse non confirmée : on emmène directement l'utilisateur sur
        // l'écran de saisie du code, avec l'email pour identifier le compte.
        if (extractApiErrorCode(err) === 'AUTH_EMAIL_NOT_VERIFIED') {
          this.router.navigate(['/auth/verify-email'], { queryParams: { email } });
          return;
        }

        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
  }

  /** Écrit la spécialité choisie à l'inscription, une fois la session ouverte. */
  private applyPendingSpeciality(): void {
    const speciality = takeSpeciality();
    if (!speciality) return;

    this.usersService
      .updateProfile({ bio: `Spécialité : ${speciality}` })
      .subscribe({ error: () => undefined });
  }

  loginWithGoogle(): void {
    this.startProvider(this.authService.loginWithGoogle(), 'Google');
  }

  loginWithGithub(): void {
    this.startProvider(this.authService.loginWithGithub(), 'GitHub');
  }

  /**
   * Lance la connexion chez un fournisseur externe. Si l'API ne connaît pas
   * ce fournisseur, l'erreur est affichée dans l'écran plutôt que dans une
   * page JSON brute du navigateur.
   */
  private startProvider(started: Observable<boolean>, provider: string): void {
    started.subscribe((redirected) => {
      if (!redirected) {
        this.errorMessage.set(
          `La connexion avec ${provider} n’est pas disponible sur le serveur. Utilisez votre e-mail et votre mot de passe.`
        );
      }
    });
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
