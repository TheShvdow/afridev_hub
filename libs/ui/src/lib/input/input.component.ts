import {
  Component,
  Input,
  Output,
  EventEmitter,
  forwardRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'afri-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      <label
        *ngIf="label"
        [for]="inputId"
        class="block text-sm font-medium text-gray-300 mb-1"
      >
        {{ label }}
        <span *ngIf="required" class="text-[var(--color-primary-500)] ml-0.5">*</span>
      </label>

      <div class="relative">
        <!-- Prefix icon slot -->
        <div *ngIf="prefixIcon" class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span [class]="'text-gray-400 ' + prefixIcon"></span>
        </div>

        <input
          [id]="inputId"
          [type]="type"
          [placeholder]="placeholder"
          [disabled]="isDisabled"
          [required]="required"
          [value]="value"
          [class]="computedInputClasses"
          (input)="onInput($event)"
          (blur)="onTouched()"
        />

        <!-- Suffix icon slot -->
        <div *ngIf="suffixIcon" class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span [class]="'text-gray-400 ' + suffixIcon"></span>
        </div>
      </div>

      <p *ngIf="hint && !error" class="mt-1 text-xs text-gray-500">{{ hint }}</p>
      <p *ngIf="error"          class="mt-1 text-xs text-red-400">{{ error }}</p>
    </div>
  `,
})
export class InputComponent implements ControlValueAccessor {
  private static counter = 0;

  @Input() label       = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel' = 'text';
  @Input() hint        = '';
  @Input() error       = '';
  @Input() required    = false;
  @Input() prefixIcon  = '';
  @Input() suffixIcon  = '';

  @Output() valueChange = new EventEmitter<string>();

  readonly inputId = `afri-input-${++InputComponent.counter}`;

  value      = '';
  isDisabled = false;

  private onChange   = (_: string) => { /* ControlValueAccessor */ };
  onTouched = () => { /* ControlValueAccessor */ };

  writeValue(val: string): void    { this.value = val ?? ''; }
  registerOnChange(fn: (v: string) => void): void   { this.onChange = fn; }
  registerOnTouched(fn: () => void): void           { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean): void       { this.isDisabled = isDisabled; }

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value = val;
    this.onChange(val);
    this.valueChange.emit(val);
  }

  get computedInputClasses(): string {
    const base = 'block w-full rounded-lg bg-gray-800 text-gray-100 placeholder-gray-500 text-sm transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const pl   = this.prefixIcon ? 'pl-10' : 'pl-3';
    const pr   = this.suffixIcon ? 'pr-10' : 'pr-3';
    const ring = this.error
      ? 'border border-red-500 focus:ring-red-500'
      : 'border border-gray-700 focus:ring-[var(--color-primary-500)] focus:border-[var(--color-primary-500)]';
    return [base, 'py-2.5', pl, pr, ring].join(' ');
  }
}
