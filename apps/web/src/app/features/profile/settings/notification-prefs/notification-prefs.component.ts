import { Component, computed, inject, signal } from '@angular/core';
import { PageHeroComponent } from '../../../../shared/components/page-hero/page-hero.component';
import { UsersService } from '../../../../core/services/users.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';

// Un seul réglage côté API : recevoir ou non les e-mails d'activité. L'enregistrement est immédiat ;
// si l'API refuse, l'interrupteur revient à son état précédent.
@Component({
  selector: 'app-notification-prefs',
  standalone: true,
  imports: [PageHeroComponent],
  template: `
    <app-page-hero title="Préférences de notifications" subtitle="Choisissez les e-mails que vous recevez." />

    <section class="bg-white">
      <div class="mx-auto w-full max-w-[800px] px-6 py-10 sm:px-10 lg:px-0">
        <div class="flex items-start justify-between gap-6 rounded-2xl border border-[#E2E8F0] p-5 sm:p-6">
          <div>
            <h2 id="email-activity-label" class="text-[18px] font-bold text-[#141219]">E-mails d'activité</h2>
            <p class="mt-1 text-[15px] leading-6 text-[#64748B]">
              Une réponse à votre question, une réponse acceptée, un vote reçu, une candidature, la décision sur votre offre.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            [attr.aria-checked]="enabled()"
            aria-labelledby="email-activity-label"
            [disabled]="saving() || !me()"
            (click)="toggle()"
            class="relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
            [class.bg-[#0F6932]]="enabled()"
            [class.bg-[#CBD5E1]]="!enabled()"
          >
            <span
              class="inline-block size-5 rounded-full bg-white shadow transition-transform"
              [class.translate-x-6]="enabled()"
              [class.translate-x-1]="!enabled()"
            ></span>
          </button>
        </div>

        <p class="mt-4 text-[14px] leading-6 text-[#64748B]">
          Les notifications dans l'application restent toujours actives. Les e-mails de confirmation (reçu de paiement, accusé de réception d'une candidature) sont envoyés quoi qu'il arrive : ils confirment une action que vous venez de faire.
        </p>

        @if (errorMessage()) {
          <p role="alert" class="mt-4 rounded-2xl border border-[#FB2C36]/30 bg-[#FB2C36]/5 px-4 py-3 text-sm font-medium text-[#FB2C36]">{{ errorMessage() }}</p>
        }
      </div>
    </section>
  `,
})
export class NotificationPrefsComponent {
  private readonly users = inject(UsersService);
  private readonly authStore = inject(AuthStore);
  private readonly toast = inject(ToastService);

  readonly me = this.authStore.currentUser;
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly enabled = computed(() => this.me()?.emailNotifications ?? true);

  toggle(): void {
    const me = this.me();
    if (!me || this.saving()) return;

    const next = !me.emailNotifications;
    this.saving.set(true);
    this.errorMessage.set(null);
    this.authStore.setUser({ ...me, emailNotifications: next });

    this.users.updateProfile({ emailNotifications: next }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(next ? 'Vous recevrez les e-mails d\'activité.' : 'Vous ne recevrez plus les e-mails d\'activité.');
      },
      error: (error) => {
        this.saving.set(false);
        this.authStore.setUser(me);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
