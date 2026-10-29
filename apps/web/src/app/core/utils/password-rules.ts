import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Les trois règles de l'API : 8 caractères, une majuscule, une minuscule, un chiffre (72 au plus). */
export function passwordRulesValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = control.value ?? '';
  if (!value) return null; // `required` s'en charge
  if (value.length < 8) return { passwordRules: 'Au moins 8 caractères.' };
  if (value.length > 72) return { passwordRules: '72 caractères au plus.' };
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return { passwordRules: 'Une majuscule, une minuscule et un chiffre sont requis.' };
  }
  return null;
}

/** Vrai quand le champ `confirm` du groupe diffère du champ `password` indiqué. */
export function sameAsValidator(passwordKey: string, confirmKey: string) {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value ?? '';
    const confirm = group.get(confirmKey)?.value ?? '';
    return confirm && password !== confirm ? { mismatch: true } : null;
  };
}
