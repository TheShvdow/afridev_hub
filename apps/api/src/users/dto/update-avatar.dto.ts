import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Clé renvoyée par POST /upload/avatar-presign, une fois le fichier envoyé vers le stockage.
export class UpdateAvatarDto {
  @ApiProperty({ example: 'avatars/<userId>/<uuid>.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  key!: string;
}
