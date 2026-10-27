import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { AuthStore } from '../../../core/store/auth.store';

interface AdminLink {
  label: string;
  path: string;
  /** L'API réserve /admin/* aux ADMIN ; signalements et offres (modération) restent ouverts aux modérateurs. */
  adminOnly: boolean;
}

const LINKS: AdminLink[] = [
  { label: 'Signalements', path: 'reports', adminOnly: false },
  { label: 'Offres à valider', path: 'jobs', adminOnly: false },
  { label: 'Utilisateurs', path: 'users', adminOnly: true },
  { label: "Journal d'audit", path: 'audit', adminOnly: true },
];

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PageHeroComponent],
  template: `
    <app-page-hero title="Administration" subtitle="Modération des contenus, des offres et des comptes." />
    <section class="bg-white">
      <div class="mx-auto w-full max-w-[1200px] px-6 py-10 sm:px-10 lg:px-0">
        <nav class="mb-8 flex flex-wrap gap-3" aria-label="Sections de l'administration">
          @for (link of links(); track link.path) {
            <a
              [routerLink]="link.path"
              routerLinkActive="bg-[#141219] text-white"
              class="rounded-full border border-[#E2E8F0] px-4 py-2 text-[15px] font-semibold text-[#141219] transition-colors hover:border-ink"
            >
              {{ link.label }}
            </a>
          }
        </nav>
        <router-outlet />
      </div>
    </section>
  `,
})
export class AdminShellComponent {
  private readonly authStore = inject(AuthStore);

  readonly links = computed(() => {
    const isAdmin = this.authStore.currentUser()?.role === 'ADMIN';
    return LINKS.filter((link) => isAdmin || !link.adminOnly);
  });
}
