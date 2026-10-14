import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'afri-tag',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Clickable tag (link to tag page) -->
    <a
      *ngIf="routerLink; else staticTag"
      [routerLink]="routerLink"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-800 text-orange-400 ring-1 ring-gray-700 hover:ring-orange-500/50 hover:bg-gray-750 transition-colors"
    >
      {{ label }}
    </a>

    <ng-template #staticTag>
      <span
        [class]="spanClasses"
        (click)="removable && removed.emit(label)"
      >
        {{ label }}
        <button
          *ngIf="removable"
          type="button"
          class="ml-0.5 -mr-0.5 h-3.5 w-3.5 rounded-full text-orange-400 hover:text-orange-200"
          (click)="removed.emit(label)"
          [attr.aria-label]="'Supprimer ' + label"
        >
          <svg viewBox="0 0 14 14" fill="currentColor">
            <path d="M4 4l6 6m0-6L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </span>
    </ng-template>
  `,
})
export class TagComponent {
  @Input() label: string = '';
  @Input() routerLink: string | null = null;
  @Input() removable = false;

  @Output() removed = new EventEmitter<string>();

  get spanClasses(): string {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-800 text-orange-400 ring-1 ring-gray-700';
    const rm   = this.removable ? 'cursor-default' : '';
    return [base, rm].filter(Boolean).join(' ');
  }
}
