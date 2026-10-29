import { Component, inject, input } from '@angular/core';
import { EMBEDDED_IN_DASHBOARD } from './embedded.token';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [],
  templateUrl: './page-hero.component.html',
})
export class PageHeroComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
  readonly embedded = inject(EMBEDDED_IN_DASHBOARD);
}
