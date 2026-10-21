import { Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Code reçu par email : 6 caractères alphanumériques, casse et espaces ignorés.
export class VerifyEmailDto {
  @ApiProperty({ example: 'K7Q2MZ', minLength: 6, maxLength: 6 })
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : value))
  @Matches(/^[A-Z0-9]{6}$/, { message: 'Le code doit contenir 6 lettres ou chiffres.' })
  code!: string;
}
