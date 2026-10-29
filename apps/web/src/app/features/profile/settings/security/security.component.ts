import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PageHeroComponent } from '../../../../shared/components/page-hero/page-hero.component';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';

// Ce que l'API permet côté sécurité : l'adresse vérifiée et la déconnexion de tous les appareils.
// Il n'y a pas encore de changement de mot de passe : la page le dit plutôt que de l'afficher vide.
@Component({
  selector: 'app-security',
  standalone: true,
  imports: [PageHeroComponent],
  template: `
    <app-page-hero title="Sécurité" subtitle="Votre adresse e-mail et vos sessions ouvertes." />

    <section class="bg-white">
      <div class="mx-auto flex w-full max-w-[800px] flex-col gap-5 px-6 py-10 sm:px-10 lg:px-0">
        <div class="rounded-2xl border border-[#E2E8F0] p-5 sm:p-6">
          <h2 class="text-[18px] font-bold text-[#141219]">Adresse e-mail</h2>
          <p class="mt-1 break-all text-[16px] text-[#141219]">{{ me()?.email }}</p>
          <p class="mt-1 text-[14px]" [class.text-[#0F6932]]="me()?.isVerified" [class.text-[#A16207]]="!me()?.isVerified">
            {{ me()?.isVerified ? 'Adresse vérifiée' : 'Adresse non vérifiée : saisissez le code reçu par e-mail pour la confirmer.' }}
          </p>
        </div>

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

        <div class="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 sm:p-6">
          <h2 class="text-[18px] font-bold text-[#141219]">Mot de passe</h2>
          <p class="mt-1 text-[15px] leading-6 text-[#64748B]">
            Le changement de mot de passe n'est pas encore disponible. En attendant, la déconnexion de tous les appareils ferme toute session que vous ne reconnaîtriez pas.
          </p>
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

  readonly me = this.authStore.currentUser;
  readonly confirming = signal(false);
  readonly working = signal(false);
  readonly errorMessage = signal<string | null>(null);

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
