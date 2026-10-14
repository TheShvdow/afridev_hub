import {
  IsString,
  IsArray,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Règles : BMAD glossaire « Question » — titre ≥ 15, corps ≥ 50, 1 à 5 tags.
// Champs alignés sur le modèle Prisma Post : title, body (tags → PostTag).
export class CreatePostDto {
  @ApiProperty({ example: 'Comment configurer Nx avec Angular 18 + SSR ?' })
  @IsString()
  @MinLength(15, { message: 'Le titre doit contenir au moins 15 caractères.' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères.' })
  title!: string;

  @ApiProperty({ example: 'J\'essaie de configurer Nx avec Angular 18 et le SSR…' })
  @IsString()
  @MinLength(50, { message: 'Le contenu doit contenir au moins 50 caractères.' })
  @MaxLength(50000)
  body!: string;

  @ApiProperty({ example: ['angular', 'nx', 'ssr'], minItems: 1, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins 1 tag est requis.' })
  @ArrayMaxSize(5, { message: 'Maximum 5 tags par question.' })
  @IsString({ each: true })
  tags!: string[];
}
