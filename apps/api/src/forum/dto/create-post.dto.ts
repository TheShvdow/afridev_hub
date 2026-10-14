import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Comment configurer Nx avec Angular 18 + SSR ?' })
  @IsString()
  @MinLength(10, { message: 'Le titre doit contenir au moins 10 caractères.' })
  @MaxLength(200, { message: 'Le titre ne peut pas dépasser 200 caractères.' })
  title!: string;

  @ApiProperty({ example: 'J\'essaie de configurer...' })
  @IsString()
  @MinLength(30, { message: 'Le contenu doit contenir au moins 30 caractères.' })
  @MaxLength(50000)
  body!: string;

  @ApiPropertyOptional({ example: ['angular', 'nx', 'ssr'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5, { message: 'Maximum 5 tags par question.' })
  tags?: string[];
}
