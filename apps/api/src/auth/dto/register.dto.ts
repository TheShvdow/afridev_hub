import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { StrongPassword } from './password';

export class RegisterDto {
  @ApiProperty({ example: 'idrissa_wade' })
  @IsString()
  @MinLength(3, { message: 'Le nom d\'utilisateur doit contenir au moins 3 caractères.' })
  @MaxLength(30, { message: 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères.' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores.',
  })
  username!: string;

  @ApiProperty({ example: 'idrissa@example.com' })
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;

  @ApiProperty({ example: 'MotDePasse123!', minLength: 8, maxLength: 72 })
  @StrongPassword()
  password!: string;
}
