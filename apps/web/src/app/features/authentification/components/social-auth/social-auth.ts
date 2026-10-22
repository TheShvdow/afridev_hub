import { Component, input, output } from '@angular/core';
import { Icon } from '../../../home/components/icon/icon';

/**
 * Boutons de connexion via un fournisseur externe (Google, GitHub).
 * L'événement est émis au parent : c'est lui qui déclenche la redirection
 * vers l'API (`GET /api/auth/google` ou `/api/auth/github`).
 */
@Component({
  selector: 'app-social-auth',
  standalone: true,
  imports: [Icon],
  templateUrl: './social-auth.html',
  styleUrl: './social-auth.css',
})
export class SocialAuth {
  readonly disabled = input(false);

  readonly google = output<void>();
  readonly github = output<void>();
}
