import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs';
import { AuthStore } from './core/store/auth.store';
import { RealtimeService } from './core/services/realtime.service';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { AppToastContainer } from './layout/toast-container/toast-container.component';

/** Pages qui n'affichent ni la barre de navigation ni le pied de page du site. */
export function hidesSiteChrome(url: string): boolean {
  return url.startsWith('/auth') || url.startsWith('/tableau-de-bord');
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, Navbar, Footer, AppToastContainer],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  // Instancié ici : la connexion temps réel suit l'état de connexion du membre.
  private readonly realtime = inject(RealtimeService);

  // Les écrans d'authentification et le tableau de bord (qui a sa barre latérale) sont pleine page :
  // la barre de navigation et le pied de page du site sont masqués.
  readonly chromeHidden = signal(false);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.chromeHidden.set(hidesSiteChrome(event.urlAfterRedirects)));
  }

  ngOnInit(): void {
    // Rehydrater l'état auth depuis le token stocké (si présent)
    this.authStore.initializeAuth();
    this.chromeHidden.set(hidesSiteChrome(this.router.url));
  }
}
