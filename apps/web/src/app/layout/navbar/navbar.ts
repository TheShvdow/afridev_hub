import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthStore } from '../../core/store/auth.store';
import { Icon } from '../../features/home/components/icon/icon';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, Icon],
  templateUrl: './navbar.html',
})
export class Navbar {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly realtime = inject(RealtimeService);

  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);
  /** Compteur partagé, tenu à jour en direct par la connexion temps réel. */
  readonly unreadCount = this.realtime.unreadCount;

  readonly links = [
    { label: 'Forum', link: '/forum' },
    { label: 'Projets', link: '/projets' },
    { label: 'Mentorat', link: '/mentorat' },
    { label: 'Emplois', link: '/jobs' },
    { label: 'Communautés', link: '/communautes' },
  ];

  /** Les modérateurs et administrateurs accèdent à l'administration. */
  readonly canModerate = computed(() => {
    const role = this.authStore.currentUser()?.role;
    return role === 'MODERATOR' || role === 'ADMIN';
  });

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.set(!this.userMenuOpen());
    if (this.userMenuOpen()) this.realtime.refreshUnread();
  }

  /** Referme le menu du compte dès qu'un clic a lieu ailleurs sur la page. */
  @HostListener('document:click')
  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  signOut(): void {
    this.menuOpen.set(false);
    this.userMenuOpen.set(false);
    this.authStore.signOut();
    void this.router.navigateByUrl('/');
  }
}
