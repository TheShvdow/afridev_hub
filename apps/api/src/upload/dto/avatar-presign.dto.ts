import { IsIn, IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 Mo, identique à la limite de PATCH /users/me/avatar

export class AvatarPresignDto {
  @ApiProperty({ enum: AVATAR_MIME_TYPES, example: 'image/jpeg' })
  @IsIn(AVATAR_MIME_TYPES, { message: 'Format non autorisé : JPEG, PNG, WebP ou GIF.' })
  mimeType!: (typeof AVATAR_MIME_TYPES)[number];

  @ApiProperty({ example: 250000, maximum: MAX_AVATAR_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_AVATAR_BYTES, { message: 'La taille maximale est de 5 Mo.' })
  fileSizeBytes!: number;
}
