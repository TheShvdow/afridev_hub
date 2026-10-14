import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Pas de champ d'expiration : le bannissement est tracé via ModerationAction (pas de bannedUntil sur User).
export class BanUserDto {
  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
