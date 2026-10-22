import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-mentor-filters',
  standalone: true,
  imports: [],
  templateUrl: './mentor-filters.component.html',
  styleUrl: './mentor-filters.component.css',
})
export class MentorFiltersComponent {
  readonly specialties = input.required<string[]>();
  readonly slots = input.required<{ value: string; label: string }[]>();

  readonly selectedSpecialty = model.required<string>();
  readonly selectedSlot = model.required<string>();
}
