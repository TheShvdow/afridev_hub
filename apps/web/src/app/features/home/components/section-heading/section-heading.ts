import { Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  imports: [],
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.css',
})
export class SectionHeading {
  readonly label = input.required<string>();
}