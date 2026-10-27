import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotificationsService } from '../../core/services/notifications.service';
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
  private readonly notifications = inject(NotificationsService);

  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly unreadCount = signal(0);

  readonly links = [
    { label: 'Forum', link: '/forum' },
    { label: 'Projets', link: '/projets' },
    { label: 'Mentorat', link: '/mentorat' },
    { label: 'Emplois', link: '/jobs' },
    { label: 'Communautés', link: '/communautes' },
  ];

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.set(!this.userMenuOpen());
    if (this.userMenuOpen()) this.refreshUnreadCount();
  }

  /** Le compteur est lu à l'ouverture du menu : pas de requête tant que le membre n'ouvre rien. */
  private refreshUnreadCount(): void {
    this.notifications.unreadCount().subscribe({
      next: ({ count }) => this.unreadCount.set(count),
      error: () => undefined,
    });
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
