import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { Icon } from '../../home/components/icon/icon';
import { AuthClose } from '../components/auth-close/auth-close';
import { AuthLayout } from '../components/auth-layout/auth-layout';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorCode, extractApiErrorMessage } from '../../../core/utils/api-error';
import { decodeJwtPayload } from '../../../core/utils/jwt';

/**
 * Page de retour du fournisseur OAuth (GitHub, Google).
 *
 * L'API renvoie les tokens dans le fragment de l'URL (`#at=…&rt=…`) et jamais
 * dans la query string : ils ne sont donc ni journalisés ni envoyés au serveur.
 * Le fragment est effacé de l'historique dès réception.
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [Icon, AuthClose, AuthLayout, RouterLink],
  templateUrl: './oauth-callback.html',
  styleUrl: './oauth-callback.css',
})
export class OauthCallback implements OnInit {
  private readonly platformId   = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);

  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken  = params.get('at');
    const refreshToken = params.get('rt');

    // Les tokens ne doivent pas rester dans l'URL (historique, capture d'écran).
    window.history.replaceState(
      {},
      document.title,
      window.location.pathname + window.location.search
    );

    if (!accessToken || !refreshToken) {
      this.error.set('Réponse du fournisseur invalide. Veuillez vous reconnecter.');
      return;
    }

    this.authStore.setTokens(accessToken, refreshToken);

    this.authService.getMe().subscribe({
      next: (user) => {
        this.authStore.setUser(user);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.authStore.logout();

        // Fournisseur sans email vérifié : le compte attend la confirmation du
        // code. L'email est lu dans le JWT uniquement pour préremplir l'écran.
        if (extractApiErrorCode(err) === 'AUTH_EMAIL_NOT_VERIFIED') {
          const email = decodeJwtPayload<{ email?: string }>(accessToken)?.email;
          this.router.navigate(['/auth/verify-email'], {
            queryParams: email ? { email } : {},
          });
          return;
        }

        this.error.set(extractApiErrorMessage(err));
      },
    });
  }
}
