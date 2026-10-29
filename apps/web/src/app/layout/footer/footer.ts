import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { LEGAL_LINKS } from '../../features/legal/legal-content';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  readonly authStore = inject(AuthStore);
  readonly legalLinks = LEGAL_LINKS;
  readonly year = new Date().getFullYear();
}
