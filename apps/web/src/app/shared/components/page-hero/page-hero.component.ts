import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [],
  templateUrl: './page-hero.component.html',
})
export class PageHeroComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
