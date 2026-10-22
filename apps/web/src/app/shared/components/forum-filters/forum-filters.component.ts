import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-forum-filters',
  standalone: true,
  imports: [],
  templateUrl: './forum-filters.component.html',
  styleUrl: './forum-filters.component.css',
})
export class ForumFiltersComponent {
  readonly tags = input.required<string[]>();
  readonly selectedTag = model.required<string>();
}
