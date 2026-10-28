import { IsArray, IsEnum, IsOptional, IsString, IsIn, ArrayMaxSize, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExperienceLevel } from '@prisma/client';
import { COUNTRY_CODES, CountryCode, toCountryCode } from '../../common/countries';
import { Transform } from 'class-transformer';

// Onboarding (story E2-4) : ne remplit que les champs encore vides ; un champ déjà renseigné n'est jamais écrasé.
export class OnboardingDto {
  @ApiPropertyOptional({ example: 'Dakar' })
  @IsOptional() @IsString() @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ enum: COUNTRY_CODES, example: 'SN', description: 'Code pays de la liste GET /api/countries' })
  @IsOptional()
  @Transform(({ value }) => toCountryCode(value))
  @IsIn(COUNTRY_CODES, { message: 'Le pays doit être un code de la liste des pays (GET /api/countries), ex. SN.' })
  country?: CountryCode;

  @ApiPropertyOptional({ enum: ExperienceLevel, example: ExperienceLevel.SENIOR })
  @IsOptional() @IsEnum(ExperienceLevel)
  level?: ExperienceLevel;

  @ApiPropertyOptional({ example: ['TypeScript', 'NestJS'] })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(30, { each: true })
  stack?: string[];
}
