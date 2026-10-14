import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'afri-empty-state',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center justify-center py-16 text-center px-4">
      <div *ngIf="icon" class="mb-4 text-5xl">{{ icon }}</div>
      <svg
        *ngIf="!icon"
        class="mx-auto mb-4 h-12 w-12 text-gray-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>

      <h3 class="mt-2 text-base font-semibold text-gray-300">{{ title }}</h3>
      <p *ngIf="description" class="mt-1 text-sm text-gray-500 max-w-xs">{{ description }}</p>

      <div *ngIf="showSlot" class="mt-6">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() title       = 'Aucun résultat';
  @Input() description = '';
  @Input() icon        = '';
  @Input() showSlot    = true;
}
