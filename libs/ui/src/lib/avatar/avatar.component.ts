import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'afri-avatar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="containerClasses">
      <img
        *ngIf="src && !imageError; else initials"
        [src]="src"
        [alt]="alt"
        [class]="imageClasses"
        (error)="imageError = true"
      />
      <ng-template #initials>
        <span [class]="initialsClasses">{{ displayInitials }}</span>
      </ng-template>

      <!-- Online indicator -->
      <span
        *ngIf="online"
        class="absolute bottom-0 right-0 block rounded-full bg-green-400 ring-2 ring-gray-900"
        [class]="indicatorSize"
      ></span>
    </div>
  `,
})
export class AvatarComponent {
  @Input() src: string | null | undefined;
  @Input() alt   = '';
  @Input() name  = '';
  @Input() size: AvatarSize = 'md';
  @Input() online = false;

  imageError = false;

  get displayInitials(): string {
    if (!this.name) return '?';
    return this.name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  get containerClasses(): string {
    const sizes: Record<AvatarSize, string> = {
      xs: 'h-6 w-6',
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    };
    return `relative inline-flex flex-shrink-0 ${sizes[this.size]}`;
  }

  get imageClasses(): string {
    return 'h-full w-full rounded-full object-cover';
  }

  get initialsClasses(): string {
    const textSizes: Record<AvatarSize, string> = {
      xs: 'text-xs',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
      xl: 'text-lg',
    };
    return `flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-700 font-semibold text-white ${textSizes[this.size]}`;
  }

  get indicatorSize(): string {
    const sizes: Record<AvatarSize, string> = {
      xs: 'h-1.5 w-1.5',
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
      xl: 'h-3.5 w-3.5',
    };
    return sizes[this.size];
  }
}
