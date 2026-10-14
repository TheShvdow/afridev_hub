import { IsString, IsNotEmpty, IsOptional, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Champs alignés sur le modèle Prisma JobApplication : message (requis), cvUrl (optionnel).
export class ApplyJobDto {
  @ApiProperty({ example: 'Motivé par ce poste, 3 ans d\'expérience NestJS.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ example: 'https://idrissawade.com/cv.pdf' })
  @IsOptional()
  @IsUrl()
  cvUrl?: string;
}
