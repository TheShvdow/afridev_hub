import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

@Component({
  selector: 'afri-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('backdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('150ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('100ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('panel', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
      ]),
      transition(':leave', [
        animate('100ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(-10px)' })),
      ]),
    ]),
  ],
  template: `
    <div
      *ngIf="open"
      @backdrop
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      [attr.aria-labelledby]="titleId"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/70 backdrop-blur-sm"
        (click)="closeOnBackdrop && closed.emit()"
      ></div>

      <!-- Panel -->
      <div @panel [class]="panelClasses">
        <!-- Header -->
        <div *ngIf="title || showClose" class="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 *ngIf="title" [id]="titleId" class="text-lg font-semibold text-gray-100">{{ title }}</h2>
          <button
            *ngIf="showClose"
            type="button"
            class="ml-auto text-gray-400 hover:text-gray-200 transition-colors"
            (click)="closed.emit()"
            aria-label="Fermer"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" class="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="px-6 py-5">
          <ng-content />
        </div>

        <!-- Footer slot -->
        <div class="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <ng-content select="[modal-footer]" />
        </div>
      </div>
    </div>
  `,
})
export class ModalComponent {
  private static counter = 0;

  @Input() open  = false;
  @Input() title = '';
  @Input() size: ModalSize = 'md';
  @Input() showClose       = true;
  @Input() closeOnBackdrop = true;

  @Output() closed = new EventEmitter<void>();

  readonly titleId = `afri-modal-title-${++ModalComponent.counter}`;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.closed.emit();
  }

  get panelClasses(): string {
    const base  = 'relative z-10 w-full rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl overflow-hidden';
    const sizes: Record<ModalSize, string> = {
      sm:   'max-w-sm',
      md:   'max-w-md',
      lg:   'max-w-lg',
      xl:   'max-w-2xl',
      full: 'max-w-5xl',
    };
    return [base, sizes[this.size]].join(' ');
  }
}
