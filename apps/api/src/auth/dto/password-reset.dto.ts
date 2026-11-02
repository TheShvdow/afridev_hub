import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { StrongPassword } from './password';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ForgotPasswordDto {
  @ApiProperty({ example: 'amadou@exemple.sn' })
  @Transform(trim)
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;
}

// Code reçu par e-mail : 6 caractères alphanumériques, casse et espaces ignorés.
export class ResetPasswordDto {
  @ApiProperty({ example: 'amadou@exemple.sn' })
  @Transform(trim)
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;

  @ApiProperty({ example: 'K7Q2MZ', minLength: 6, maxLength: 6 })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value))
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Le code doit contenir 6 lettres ou chiffres.' })
  code!: string;

  @ApiProperty({ example: 'NouveauMotDePasse1', minLength: 8, maxLength: 72 })
  @StrongPassword()
  newPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'AncienMotDePasse1' })
  @IsString()
  @IsNotEmpty({ message: 'Saisissez votre mot de passe actuel.' })
  currentPassword!: string;

  @ApiProperty({ example: 'NouveauMotDePasse1', minLength: 8, maxLength: 72 })
  @StrongPassword()
  newPassword!: string;
}
