import { IsIn, IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const CV_MIME_TYPES = ['application/pdf'] as const;
export const MAX_CV_BYTES = 5 * 1024 * 1024; // 5 Mo (FR-31, NFR-13)

export class CvPresignDto {
  @ApiProperty({ enum: CV_MIME_TYPES, example: 'application/pdf' })
  @IsIn(CV_MIME_TYPES, { message: 'Le CV doit être un PDF.' })
  mimeType!: (typeof CV_MIME_TYPES)[number];

  @ApiProperty({ example: 350000, maximum: MAX_CV_BYTES })
  @IsInt()
  @Min(1)
  @Max(MAX_CV_BYTES, { message: 'La taille maximale est de 5 Mo.' })
  fileSizeBytes!: number;
}
