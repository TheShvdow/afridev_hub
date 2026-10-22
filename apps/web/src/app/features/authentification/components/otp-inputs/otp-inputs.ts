import { Component, ElementRef, QueryList, ViewChildren, computed, input, output, signal } from '@angular/core';

/**
 * Saisie d'un code à 6 caractères (majuscules et chiffres).
 * L'API envoie un code alphanumérique (`/^[A-Z0-9]{6}$/`) : les lettres sont
 * donc acceptées, et le code est normalisé en majuscules avant l'envoi.
 */
@Component({
  selector: 'app-otp-inputs',
  standalone: true,
  templateUrl: './otp-inputs.html',
  styleUrl: './otp-inputs.css',
})
export class OtpInputs {
  @ViewChildren('digit') private digits!: QueryList<ElementRef<HTMLInputElement>>;

  readonly length = input(6);
  readonly code = output<string>();

  readonly values = signal<string[]>([]);
  readonly boxes = computed(() => Array.from({ length: this.length() }, (_, index) => index));

  onInput(index: number, event: Event): void {
    const field = event.target as HTMLInputElement;
    const value = field.value.replace(/[^a-zA-Z0-9]/g, '').slice(-1).toUpperCase();

    field.value = value;

    const values = [...this.values()];
    values[index] = value;
    this.values.set(values);
    this.emit();

    if (value && index < this.length() - 1) {
      this.digits.get(index + 1)?.nativeElement.focus();
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.values()[index] && index > 0) {
      this.digits.get(index - 1)?.nativeElement.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      this.digits.get(index - 1)?.nativeElement.focus();
    }

    if (event.key === 'ArrowRight' && index < this.length() - 1) {
      this.digits.get(index + 1)?.nativeElement.focus();
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = (event.clipboardData?.getData('text') ?? '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (!text) {
      return;
    }

    event.preventDefault();

    const values = Array.from({ length: this.length() }, (_, index) => text[index] ?? '');
    this.values.set(values);

    this.digits.forEach((digit, index) => {
      digit.nativeElement.value = values[index] ?? '';
    });

    this.emit();
    this.digits.get(Math.min(text.length, this.length() - 1))?.nativeElement.focus();
  }

  private emit(): void {
    this.code.emit(this.values().join(''));
  }
}
