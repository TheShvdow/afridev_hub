import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  HostListener,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthStore } from '../../core/store/auth.store';
import { Icon } from '../../features/home/components/icon/icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly realtime = inject(RealtimeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);
  /** Compteur partagé, tenu à jour en direct par la connexion temps réel. */
  readonly unreadCount = this.realtime.unreadCount;
  /** Nombre affiché sur la pastille, plafonné ; le même nombre est repris dans le nom accessible du bouton. */
  readonly badgeCount = computed(() => Math.min(this.unreadCount(), 99));

  readonly links = [
    { label: 'Forum', link: '/forum' },
    { label: 'Projets', link: '/projets' },
    { label: 'Mentorat', link: '/mentorat' },
    { label: 'Emplois', link: '/jobs' },
    { label: 'Communautés', link: '/communautes' },
    { label: 'Classement', link: '/leaderboard' },
  ];

  /** Les modérateurs et administrateurs accèdent à l'administration. */
  readonly canModerate = computed(() => {
    const role = this.authStore.currentUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.unlockBodyScroll());
  }

  toggleMobileMenu(): void {
    this.menuOpen.update((open) => !open);
    this.syncBodyScroll();
    if (this.menuOpen()) this.userMenuOpen.set(false);
  }

  closeMobileMenu(): void {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.unlockBodyScroll();
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.set(!this.userMenuOpen());
    if (this.userMenuOpen()) {
      this.closeMobileMenu();
      this.realtime.refreshUnread();
    }
  }

  /** Referme le menu du compte dès qu'un clic a lieu ailleurs sur la page. */
  @HostListener('document:click')
  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobileMenu();
    this.userMenuOpen.set(false);
  }

  signOut(): void {
    this.closeMobileMenu();
    this.userMenuOpen.set(false);
    this.authStore.signOut();
    void this.router.navigateByUrl('/');
  }

  private syncBodyScroll(): void {
    if (this.menuOpen()) this.lockBodyScroll();
    else this.unlockBodyScroll();
  }

  private lockBodyScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.classList.add('overflow-hidden');
  }

  private unlockBodyScroll(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.documentElement.classList.remove('overflow-hidden');
  }
}
