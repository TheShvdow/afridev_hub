import { NgClass } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../core/store/auth.store';
import { initialsFrom } from '../../shared/utils/forum-thread.mapper';
import { profilePath } from '../../shared/utils/profile-link';
import { Icon } from '../home/components/icon/icon';
import { DashboardContextService } from './dashboard-context.service';
import { DASHBOARD_HOME, roleLabels } from './dashboard-sections';

/** Pages de modération et d'administration : elles n'ont pas de marge propre. */
export function needsPagePadding(url: string): boolean {
  return /\/(moderation|administration)\//.test(url);
}

// Coquille du tableau de bord : une barre latérale (un tiroir sur téléphone) qui range toutes les
// fonctions du compte selon son rôle, et un retour vers le site. La barre de navigation et le pied
// de page du site sont masqués ici (voir AppComponent).
@Component({
  selector: 'app-dashboard-shell',
  standalone: true,
  imports: [NgClass, RouterOutlet, RouterLink, RouterLinkActive, Icon],
  templateUrl: './dashboard-shell.component.html',
})
export class DashboardShellComponent {
  private readonly authStore = inject(AuthStore);
  private readonly figures = inject(DashboardContextService);
  private readonly router = inject(Router);

  readonly home = DASHBOARD_HOME;
  readonly me = this.authStore.currentUser;
  readonly menuOpen = signal(false);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );
  /**
   * Les pages de modération et d'administration n'ont pas de marge propre (l'ancienne coquille
   * d'administration la leur donnait) : on la leur donne. Les autres pages ont la leur.
   */
  readonly paddedPage = computed(() => needsPagePadding(this.url()));

  readonly sections = computed(() => {
    const me = this.me();
    return me ? this.figures.sections(me) : [];
  });
  readonly roles = computed(() => {
    const me = this.me();
    return me ? roleLabels(me) : [];
  });
  readonly displayName = computed(() => this.me()?.displayName ?? this.me()?.username ?? '');
  readonly initials = computed(() => initialsFrom(this.displayName()));
  readonly publicProfile = computed(() => profilePath(this.me()));

  constructor() {
    // Les chiffres (notifications, plan, éléments à modérer) se lisent dès que le profil est là,
    // quelle que soit la page ouverte dans le tableau de bord.
    effect(() => {
      const me = this.me();
      if (me) untracked(() => this.figures.load(me));
    });
  }

  /** La touche Échap ferme le tiroir, comme le fond sombre ou le bouton de fermeture. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  signOut(): void {
    this.menuOpen.set(false);
    this.authStore.signOut();
    void this.router.navigateByUrl('/');
  }
}
