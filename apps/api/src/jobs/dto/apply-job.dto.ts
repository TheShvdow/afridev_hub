import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// FR-31 : message de motivation et CV PDF optionnel, envoyé d'abord via POST /upload/cv-presign.
export class ApplyJobDto {
  @ApiProperty({ example: 'Motivé par ce poste, 3 ans d\'expérience NestJS.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiPropertyOptional({ example: 'cvs/2f1c…/9a7e….pdf', description: 'Clé renvoyée par POST /upload/cv-presign' })
  @IsOptional()
  @IsString()
  cvKey?: string;
}
