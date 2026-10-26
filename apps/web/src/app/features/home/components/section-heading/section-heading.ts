import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [],
  templateUrl: './section-heading.html',
})
export class SectionHeading {
  readonly label = input.required<string>();
}