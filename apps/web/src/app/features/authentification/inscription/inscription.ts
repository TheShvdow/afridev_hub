import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthField } from '../components/auth-field/auth-field';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthPasswordField } from '../components/auth-password-field/auth-password-field';
import { AuthSide, AuthStep } from '../components/auth-side/auth-side';
import { PasswordStrength } from '../components/password-strength/password-strength';
import { SocialAuth } from '../components/social-auth/social-auth';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { UsersService } from '../../../core/services/users.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-inscription',
  standalone: true,
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
  private readonly fb           = inject(FormBuilder);
  private readonly authService  = inject(AuthService);
  private readonly authStore    = inject(AuthStore);
  private readonly usersService = inject(UsersService);
  private readonly router       = inject(Router);

  readonly loading      = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
      description: 'Un code à 6 caractères, valable 24 heures',
      state: 'todo',
    },
  ];

  readonly form = this.fb.nonNullable.group({
    username: ['', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(30),
      Validators.pattern(/^[a-zA-Z0-9_-]+$/),
    ]],
    email: ['', [Validators.required, Validators.email]],
    speciality: ['', [Validators.required]],
    password: ['', [
      Validators.required,
      Validators.minLength(8),
      Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    ]],
  });

  readonly password = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, email, password, speciality } = this.form.getRawValue();

    this.loading.set(true);
    this.errorMessage.set(null);

    // L'API n'accepte que `username`, `email` et `password` : la spécialité
    // est enregistrée dans le profil juste après la création du compte.
    this.authService.register({ username, email, password }).subscribe({
      next: (tokens) => {
        this.authStore.setTokens(tokens.accessToken, tokens.refreshToken);

        this.authService.getMe().subscribe({
          next: (user) => this.authStore.setUser(user),
          error: () => undefined,
        });

        this.saveSpeciality(speciality);

        // Le parcours de vérification est piloté par `POST /api/auth/verify-email` :
        // c'est cette route qui est appelée à l'inscription, puis à la saisie
        // du code reçu. `POST /api/auth/resend-verification` n'est utilisé que
        // par le bouton « Renvoyer le code » de l'écran de vérification.
        this.authService.verifyEmailOnSignup().subscribe({ error: () => undefined });

        this.router.navigate(['/auth/verify-email'], { queryParams: { email } });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
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

  /**
   * La spécialité n'existe pas dans `RegisterDto` : elle est écrite dans la
   * biographie du profil. Un échec n'empêche pas la création du compte.
   */
  private saveSpeciality(speciality: string): void {
    this.usersService.updateProfile({ bio: `Spécialité : ${speciality}` }).subscribe({
      error: () => undefined,
    });
  }
}
