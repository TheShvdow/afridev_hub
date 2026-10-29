import { FormControl, FormGroup } from '@angular/forms';
import { passwordRulesValidator, sameAsValidator } from './password-rules';

const check = (value: string) => passwordRulesValidator(new FormControl(value, { nonNullable: true }));

describe('password rules', () => {
  it('accepts 8 characters with a capital, a lower-case letter and a digit', () => {
    expect(check('Valide123')).toBeNull();
  });

  it.each(['court1A', 'toutenminuscule1', 'TOUTENMAJUSCULE1', 'SansChiffreIci'])('refuses %s', (value) => {
    expect(check(value)?.['passwordRules']).toBeTruthy();
  });

  it('refuses more than 72 characters, where bcrypt would silently cut', () => {
    expect(check('Aa1' + 'x'.repeat(70))?.['passwordRules']).toContain('72');
  });

  it('leaves an empty value to the required validator', () => {
    expect(check('')).toBeNull();
  });

  it('flags a confirmation that differs, and stays silent while it is empty', () => {
    const group = (password: string, confirm: string) =>
      new FormGroup({ password: new FormControl(password), confirm: new FormControl(confirm) }, { validators: sameAsValidator('password', 'confirm') });
    expect(group('Valide123', 'Autre1234').errors).toEqual({ mismatch: true });
    expect(group('Valide123', 'Valide123').errors).toBeNull();
    expect(group('Valide123', '').errors).toBeNull();
  });
});
