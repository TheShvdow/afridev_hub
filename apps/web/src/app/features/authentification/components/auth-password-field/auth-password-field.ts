import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Icon } from '../../../home/components/icon/icon';

@Component({
  selector: 'app-auth-password-field',
  standalone: true,
  imports: [Icon],
  templateUrl: './auth-password-field.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AuthPasswordField),
      multi: true,
    },
  ],
})
export class AuthPasswordField implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly placeholder = input<string>('');
  readonly name = input<string>('');
  readonly autocomplete = input<string>('current-password');
  readonly required = input(true);
  readonly invalid = input(false);

  readonly value = signal('');
  readonly visible = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    this.value.set(value);
    this.onChange(value);
    this.onTouched();
  }
}
