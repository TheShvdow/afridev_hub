import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../../../shared/components/page-hero/page-hero.component';
import { AuthPasswordField } from '../../../authentification/components/auth-password-field/auth-password-field';
import { PasswordStrength } from '../../../authentification/components/password-strength/password-strength';
import { extractApiErrorCode } from '../../../../core/utils/api-error';
import { passwordRulesValidator, sameAsValidator } from '../../../../core/utils/password-rules';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';

// Sécurité du compte : l'adresse vérifiée, le changement de mot de passe et la déconnexion de tous
// les appareils.
@Component({
  selector: 'app-security',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent, AuthPasswordField, PasswordStrength],
  template: `
    <app-page-hero title="Sécurité" subtitle="Votre adresse e-mail, votre mot de passe et vos sessions ouvertes." />

    <section class="bg-white">
      <div class="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-6 py-10 sm:px-10 lg:px-0">
        <div class="rounded-2xl border border-[#E2E8F0] p-5 sm:p-6">
          <h2 class="text-[18px] font-bold text-[#141219]">Adresse e-mail</h2>
          <p class="mt-1 break-all text-[16px] text-[#141219]">{{ me()?.email }}</p>
          <p class="mt-1 text-[14px]" [class.text-[#0F6932]]="me()?.isVerified" [class.text-[#A16207]]="!me()?.isVerified">
            {{ me()?.isVerified ? 'Adresse vérifiée' : 'Adresse non vérifiée : saisissez le code reçu par e-mail pour la confirmer.' }}
          </p>
        </div>

        <form class="rounded-2xl border border-[#E2E8F0] p-5 sm:p-6" [formGroup]="passwordForm" (ngSubmit)="changePassword()" novalidate>
          <h2 class="text-[18px] font-bold text-[#141219]">Mot de passe</h2>
          <p class="mt-1 text-[15px] leading-6 text-[#64748B]">
            Vos autres appareils seront déconnectés ; celui-ci reste connecté.
          </p>

          @if (passwordError()) {
            <p role="alert" class="mt-3 rounded-2xl border border-[#FB2C36]/30 bg-[#FB2C36]/5 px-4 py-3 text-sm font-medium text-[#FB2C36]">
              {{ passwordError() }}
              @if (noPassword()) {
                <a routerLink="/auth/forgot-password" class="underline">Définir un mot de passe</a>
              }
            </p>
          }

          <div class="mt-4 flex flex-col gap-3">
            <app-auth-password-field
              label="Mot de passe actuel"
              placeholder="Votre mot de passe actuel"
              name="currentPassword"
              autocomplete="current-password"
              [invalid]="passwordForm.controls.currentPassword.invalid && passwordForm.controls.currentPassword.touched"
              formControlName="currentPassword"
            />
            <app-auth-password-field
              label="Nouveau mot de passe"
              placeholder="Choisissez un mot de passe"
              name="newPassword"
              autocomplete="new-password"
              [invalid]="passwordForm.controls.newPassword.invalid && passwordForm.controls.newPassword.touched"
              formControlName="newPassword"
            />
            <app-password-strength [password]="passwordForm.controls.newPassword.value" />
            <app-auth-password-field
              label="Confirmer le nouveau mot de passe"
              placeholder="Saisissez-le une seconde fois"
              name="confirm"
              autocomplete="new-password"
              [invalid]="passwordForm.hasError('mismatch') && passwordForm.controls.confirm.touched"
              formControlName="confirm"
            />
            @if (passwordForm.hasError('mismatch') && passwordForm.controls.confirm.touched) {
              <p class="text-xs font-medium text-[#FB2C36]">Les deux mots de passe ne sont pas identiques.</p>
            }
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-4">
            <button type="submit" [disabled]="changing()" class="rounded-full bg-[#0F1011] px-5 py-2.5 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {{ changing() ? 'Enregistrement…' : 'Changer le mot de passe' }}
            </button>
            <a routerLink="/auth/forgot-password" class="text-[14px] font-medium text-[#64748B] underline-offset-4 hover:text-[#141219] hover:underline">Mot de passe oublié ?</a>
          </div>
        </form>

        <div class="rounded-2xl border border-[#E2E8F0] p-5 sm:p-6">
          <h2 class="text-[18px] font-bold text-[#141219]">Sessions ouvertes</h2>
          <p class="mt-1 text-[15px] leading-6 text-[#64748B]">
            Vous êtes connecté sur cet appareil et peut-être sur d'autres. Si vous avez un doute, déconnectez-vous partout : vous devrez vous reconnecter ensuite.
          </p>

          @if (errorMessage()) {
            <p role="alert" class="mt-3 rounded-2xl border border-[#FB2C36]/30 bg-[#FB2C36]/5 px-4 py-3 text-sm font-medium text-[#FB2C36]">{{ errorMessage() }}</p>
          }

          <div class="mt-4 flex flex-wrap items-center gap-3">
            @if (confirming()) {
              <span class="text-[14px] font-medium text-[#64748B]">Déconnecter tous vos appareils ?</span>
              <button type="button" (click)="confirming.set(false)" [disabled]="working()" class="rounded-full border border-[#E2E8F0] px-4 py-2 text-[14px] font-semibold text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-60">Annuler</button>
              <button type="button" (click)="signOutEverywhere()" [disabled]="working()" class="rounded-full bg-[#FB2C36] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
                {{ working() ? 'Déconnexion…' : 'Oui, me déconnecter partout' }}
              </button>
            } @else {
              <button type="button" (click)="confirming.set(true)" class="rounded-full border border-[#0F1011] px-5 py-2.5 text-[15px] font-semibold text-[#0F1011] transition-colors hover:bg-[#0F1011] hover:text-white">
                Me déconnecter de tous les appareils
              </button>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class SecurityComponent {
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  private readonly fb = inject(FormBuilder);

  readonly me = this.authStore.currentUser;

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, passwordRulesValidator]],
      confirm: ['', [Validators.required]],
    },
    { validators: sameAsValidator('newPassword', 'confirm') },
  );
  readonly changing = signal(false);
  readonly passwordError = signal<string | null>(null);
  /** Compte GitHub ou Google sans mot de passe : la page propose d'en définir un. */
  readonly noPassword = signal(false);

  readonly confirming = signal(false);
  readonly working = signal(false);
  readonly errorMessage = signal<string | null>(null);

  changePassword(): void {
    if (this.changing()) return;

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.changing.set(true);
    this.passwordError.set(null);
    this.noPassword.set(false);

    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: (tokens) => {
        this.changing.set(false);
        // Les autres appareils viennent d'être déconnectés : ranger tout de suite les jetons de celui-ci,
        // dans le même stockage que la session actuelle.
        this.authStore.setTokens(tokens.accessToken, tokens.refreshToken, this.sessionIsRemembered());
        this.passwordForm.reset();
        this.toast.success('Votre mot de passe a été changé. Vos autres appareils sont déconnectés.');
      },
      error: (error) => {
        this.changing.set(false);
        this.noPassword.set(extractApiErrorCode(error) === 'AUTH_NO_PASSWORD');
        this.passwordError.set(extractApiErrorMessage(error));
      },
    });
  }

  /** Vrai quand la session est gardée au-delà de l'onglet (« Rester connecté »). */
  private sessionIsRemembered(): boolean {
    try {
      return localStorage.getItem('afridev_rt') !== null;
    } catch {
      return true;
    }
  }

  signOutEverywhere(): void {
    if (this.working()) return;

    this.working.set(true);
    this.errorMessage.set(null);

    this.authService.logoutAll().subscribe({
      next: () => {
        this.working.set(false);
        this.authStore.signOut();
        this.toast.success('Vous êtes déconnecté de tous vos appareils.');
        void this.router.navigateByUrl('/auth/login');
      },
      error: (error) => {
        this.working.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
