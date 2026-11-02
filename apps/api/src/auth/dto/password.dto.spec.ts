import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './password-reset.dto';
import { RegisterDto } from './register.dto';

const errorsOf = async <T extends object>(cls: new () => T, plain: Record<string, unknown>) =>
  (await validate(plainToInstance(cls, plain))).flatMap((e) => Object.values(e.constraints ?? {}));

describe('règle du mot de passe (inscription, réinitialisation, changement)', () => {
  const weak = ['court1A', 'toutenminuscule1', 'TOUTENMAJUSCULE1', 'SansChiffreIci', 'a'.repeat(73) + 'A1'];

  it.each(weak)('refuses %s everywhere', async (password) => {
    expect(await errorsOf(ResetPasswordDto, { email: 'a@b.sn', code: 'K7Q2MZ', newPassword: password })).not.toHaveLength(0);
    expect(await errorsOf(ChangePasswordDto, { currentPassword: 'x', newPassword: password })).not.toHaveLength(0);
    expect(await errorsOf(RegisterDto, { username: 'amadou', email: 'a@b.sn', password })).not.toHaveLength(0);
  });

  it('accepts a password with 8 characters, a capital, a lower-case letter and a digit', async () => {
    expect(await errorsOf(ResetPasswordDto, { email: 'a@b.sn', code: 'K7Q2MZ', newPassword: 'Valide123' })).toHaveLength(0);
    expect(await errorsOf(RegisterDto, { username: 'amadou', email: 'a@b.sn', password: 'Valide123' })).toHaveLength(0);
  });

  it('normalises the code (case and spaces) and the e-mail', async () => {
    const dto = plainToInstance(ResetPasswordDto, { email: '  a@b.sn ', code: ' k7q 2mz ', newPassword: 'Valide123' });
    expect(dto.code).toBe('K7Q2MZ');
    expect(dto.email).toBe('a@b.sn');
    expect(await validate(dto)).toHaveLength(0);
  });

  it('requires a valid address to ask for a code, and the current password to change it', async () => {
    expect(await errorsOf(ForgotPasswordDto, { email: 'pas-un-email' })).not.toHaveLength(0);
    expect(await errorsOf(ChangePasswordDto, { currentPassword: '', newPassword: 'Valide123' })).not.toHaveLength(0);
  });
});
