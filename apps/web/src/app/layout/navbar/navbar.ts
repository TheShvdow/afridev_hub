import { Component, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { Icon } from '../../features/home/components/icon/icon';
import { NotificationsService } from '../../core/services/notifications.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly notificationsService = inject(NotificationsService);
  readonly unreadCount = signal(0);

  readonly menuOpen = signal(false);
  readonly userMenuOpen = signal(false);

  constructor() {
    if (this.authStore.isAuthenticated()) {
      this.loadNotifications();
    }
  }

  private loadNotifications(): void {
    this.notificationsService
      .getUnreadCount()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res) => {
          this.unreadCount.set(res?.count ?? 0);
        },
        error: () => {},
      });
  }

  readonly links = [
    { label: 'Forum', link: '/forum' },
    { label: 'Projets', link: '/projets' },
    { label: 'Mentorat', link: '/mentorat' },
    { label: 'Emplois', link: '/jobs' },
    { label: 'Communautés', link: '/communautes' },
    { label: 'Classement', link: '/leaderboard' },
  ];

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.userMenuOpen.set(!this.userMenuOpen());
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
