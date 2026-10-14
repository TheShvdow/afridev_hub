import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OAuthLinkDto {
  @ApiProperty({ description: 'Jeton de liaison reçu après la connexion OAuth (10 min)' })
  @IsString()
  @IsNotEmpty()
  linkToken!: string;

  @ApiProperty({ description: 'Mot de passe du compte existant, pour prouver qu\'il vous appartient' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
