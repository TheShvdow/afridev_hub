import { IsString, IsOptional, MaxLength, IsUrl, Matches, IsArray, ArrayMaxSize, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Idrissa Wade' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Développeur fullstack à Dakar 🇸🇳' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Dakar, Sénégal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'SN', description: 'Code pays ISO 3166-1 alpha-2' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'Le pays doit être un code ISO 3166-1 alpha-2 (ex. SN).' })
  country?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'NestJS'], description: 'Technologies déclarées (max 10)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(30, { each: true })
  stack?: string[];

  @ApiPropertyOptional({ example: 'https://idrissawade.dev' })
  @IsOptional()
  @IsUrl({}, { message: 'URL de site web invalide.' })
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'idrissa_gh' })
  @IsOptional()
  @IsString()
  @MaxLength(39)
  githubUsername?: string;

  @ApiPropertyOptional({ example: 'idrissa_li' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkedinUsername?: string;

  @ApiPropertyOptional({ example: 'idrissa_twitter' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  twitterUsername?: string;
}
