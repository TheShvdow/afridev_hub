import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../spinner/spinner.component';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg';

@Component({
  selector: 'afri-button',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="computedClasses"
      (click)="clicked.emit($event)"
    >
      <afri-spinner *ngIf="loading" size="sm" class="mr-2" />
      <ng-content />
    </button>
  `,
  styles: [`
    :host { display: inline-block; }
  `],
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize       = 'md';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() loading  = false;
  @Input() fullWidth = false;

  @Output() clicked = new EventEmitter<MouseEvent>();

  get computedClasses(): string {
    const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants: Record<ButtonVariant, string> = {
      primary:   'bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)]',
      secondary: 'bg-gray-800 text-white hover:bg-gray-700 focus:ring-gray-500',
      ghost:     'bg-transparent text-gray-300 hover:bg-gray-800 focus:ring-gray-500',
      danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      outline:   'border border-[var(--color-primary-500)] text-[var(--color-primary-500)] hover:bg-[var(--color-primary-500)] hover:text-white focus:ring-[var(--color-primary-500)]',
    };

    const sizes: Record<ButtonSize, string> = {
      xs: 'px-2.5 py-1.5 text-xs',
      sm: 'px-3 py-2 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const width = this.fullWidth ? 'w-full' : '';

    return [base, variants[this.variant], sizes[this.size], width].filter(Boolean).join(' ');
  }
}
