import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeColor = 'orange' | 'green' | 'blue' | 'red' | 'yellow' | 'purple' | 'gray';
export type BadgeSize  = 'xs' | 'sm' | 'md';

@Component({
  selector: 'afri-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="computedClasses">
      <ng-content />
    </span>
  `,
})
export class BadgeComponent {
  @Input() color: BadgeColor = 'orange';
  @Input() size: BadgeSize   = 'sm';
  @Input() pill = true;

  get computedClasses(): string {
    const base   = 'inline-flex items-center font-medium';
    const radius = this.pill ? 'rounded-full' : 'rounded';

    const colors: Record<BadgeColor, string> = {
      orange: 'bg-orange-900/40 text-orange-400 ring-1 ring-orange-500/30',
      green:  'bg-green-900/40 text-green-400 ring-1 ring-green-500/30',
      blue:   'bg-blue-900/40 text-blue-400 ring-1 ring-blue-500/30',
      red:    'bg-red-900/40 text-red-400 ring-1 ring-red-500/30',
      yellow: 'bg-yellow-900/40 text-yellow-400 ring-1 ring-yellow-500/30',
      purple: 'bg-purple-900/40 text-purple-400 ring-1 ring-purple-500/30',
      gray:   'bg-gray-800 text-gray-400 ring-1 ring-gray-600/30',
    };

    const sizes: Record<BadgeSize, string> = {
      xs: 'px-1.5 py-0.5 text-xs',
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    return [base, radius, colors[this.color], sizes[this.size]].join(' ');
  }
}
