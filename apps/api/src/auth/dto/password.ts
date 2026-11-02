import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Règle du mot de passe : la même à l'inscription, à la réinitialisation et au changement.
// Le front la reprend à l'identique (indicateur de force du mot de passe).
export function StrongPassword() {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' }),
    // Au-delà, bcrypt tronque silencieusement : on refuse plutôt que d'ignorer la fin.
    MaxLength(72, { message: 'Le mot de passe ne peut pas dépasser 72 caractères.' }),
    Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.',
    }),
  );
}
