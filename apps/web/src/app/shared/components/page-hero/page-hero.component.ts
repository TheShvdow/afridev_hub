import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  imports: [],
  templateUrl: './page-hero.component.html',
  styleUrl: './page-hero.component.css',
})
export class PageHeroComponent {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
