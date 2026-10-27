import { Component, computed, input } from '@angular/core';
import { Icon } from '../../../home/components/icon/icon';

@Component({
  selector: 'app-password-strength',
  standalone: true,
  imports: [Icon],
  templateUrl: './password-strength.html',
})
export class PasswordStrength {
  readonly password = input<string>('');

  readonly checks = computed(() => {
    const value = this.password();

    // Les trois règles correspondent exactement au mot de passe exigé par
    // l'API (`RegisterDto`) : 8 caractères, une majuscule, une minuscule, un chiffre.
    return [
      { label: '8 caractères min', valid: value.length >= 8 },
      { label: 'Majuscule & minuscule', valid: /[a-z]/.test(value) && /[A-Z]/.test(value) },
      { label: 'Un chiffre', valid: /\d/.test(value) },
    ];
  });

  readonly score = computed(() => this.checks().filter((check) => check.valid).length);

  readonly label = computed(() => {
    if (!this.password()) {
      return 'Trop faible';
    }

    return ['Trop faible', 'Faible', 'Moyen', 'Fort'][this.score()];
  });

  readonly barColor = computed(() => {
    const score = this.score();

    if (!this.password() || score === 0) {
      return '#E2E8F0';
    }

    if (score === 1) {
      return '#FB2C36';
    }

    if (score === 2) {
      return '#FBBF24';
    }

    return '#0F6932';
  });
}
