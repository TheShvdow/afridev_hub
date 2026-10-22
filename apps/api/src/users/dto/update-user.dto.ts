import { IsString, IsOptional, MaxLength, IsUrl, Matches, IsArray, ArrayMaxSize, MinLength, IsEnum, IsBoolean, IsIn } from 'class-validator';
import { ExperienceLevel } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { COUNTRY_CODES, CountryCode, toCountryCode } from '../../common/countries';
import { Transform } from 'class-transformer';

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

  @ApiPropertyOptional({ enum: COUNTRY_CODES, example: 'SN', description: 'Code pays de la liste GET /api/countries' })
  @IsOptional()
  @Transform(({ value }) => toCountryCode(value))
  @IsIn(COUNTRY_CODES, { message: 'Le pays doit être un code de la liste des pays (GET /api/countries), ex. SN.' })
  country?: CountryCode;

  @ApiPropertyOptional({ enum: ExperienceLevel, description: 'Niveau d\'expérience déclaré' })
  @IsOptional()
  @IsEnum(ExperienceLevel)
  level?: ExperienceLevel;

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

  @ApiPropertyOptional({ example: 'XOF', description: 'Devise d\'affichage des salaires, ISO 4217 (FR-30)' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex. XOF).' })
  preferredCurrency?: string;

  @ApiPropertyOptional({ example: true, description: 'Recevoir les emails d\'activité du forum (FR-18)' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}
