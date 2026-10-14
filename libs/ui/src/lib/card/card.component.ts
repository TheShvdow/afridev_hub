import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'afri-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="computedClasses">
      <ng-content select="[card-header]" />
      <ng-content />
      <ng-content select="[card-footer]" />
    </div>
  `,
})
export class CardComponent {
  @Input() padding: CardPadding = 'md';
  @Input() hoverable = false;
  @Input() bordered  = true;
  @Input() extraClass = '';

  get computedClasses(): string {
    const base    = 'bg-gray-900 rounded-xl';
    const border  = this.bordered  ? 'border border-gray-700' : '';
    const hover   = this.hoverable ? 'transition-shadow hover:shadow-lg hover:shadow-[color-mix(in_srgb,var(--color-primary-900)_20%,transparent)] hover:border-gray-600 cursor-pointer' : '';

    const paddings: Record<CardPadding, string> = {
      none: '',
      sm:   'p-3',
      md:   'p-5',
      lg:   'p-8',
    };

    return [base, border, hover, paddings[this.padding], this.extraClass]
      .filter(Boolean).join(' ');
  }
}
