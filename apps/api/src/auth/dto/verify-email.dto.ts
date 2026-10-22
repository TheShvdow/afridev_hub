import { IsEmail, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

const normalizeEmail = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// Code reçu par email : 6 caractères alphanumériques, casse et espaces ignorés.
// L'email identifie le compte, car l'utilisateur n'a pas encore de token.
export class VerifyEmailDto {
  @ApiProperty({ example: 'amadou@exemple.sn' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;

  @ApiProperty({ example: 'K7Q2MZ', minLength: 6, maxLength: 6 })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value))
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Le code doit contenir 6 lettres ou chiffres.' })
  code!: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'amadou@exemple.sn' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;
}
