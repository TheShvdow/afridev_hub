import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LEGAL_DOCS, LEGAL_LINKS, LEGAL_UPDATED, LegalSlug } from './legal-content';

/** Page légale : le texte vient de `LEGAL_DOCS`, la clé de la donnée de route `doc`. */
@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal-page.component.html',
})
export class LegalPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly doc = LEGAL_DOCS[this.route.snapshot.data['doc'] as LegalSlug];
  readonly links = LEGAL_LINKS;
  readonly updated = LEGAL_UPDATED;
}
