import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COUNTRY_CODES, CountryCode } from '../../common/countries';

// Chaîne vide → absente : un champ laissé vide dans le formulaire n'est pas une valeur.
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value;

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

// FR-31 : message de motivation, informations du candidat et CV PDF optionnel, envoyé d'abord via POST /upload/cv-presign.
export class ApplyJobDto {
  @ApiProperty({ example: 'Motivé par ce poste, 3 ans d\'expérience NestJS.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @ApiProperty({ example: 'Aminata Diallo' })
  @Transform(emptyToUndefined)
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiPropertyOptional({ example: '+221 77 123 45 67' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @Matches(/^\+?[0-9 ().-]{6,20}$/, { message: 'Le numéro de téléphone n\'est pas valide.' })
  phone?: string;

  @ApiPropertyOptional({ enum: COUNTRY_CODES, example: 'SN', description: 'Pays de résidence (code ISO alpha-2)' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsIn(COUNTRY_CODES, { message: 'Le pays doit être un code de la liste des pays acceptés (ex. SN).' })
  country?: CountryCode;

  @ApiPropertyOptional({ example: 'Dakar' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: 'https://www.linkedin.com/in/aminata-diallo' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl(URL_OPTIONS, { message: 'Le lien LinkedIn doit être une adresse complète (https://…).' })
  @MaxLength(200)
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/aminata-dev' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl(URL_OPTIONS, { message: 'Le lien GitHub doit être une adresse complète (https://…).' })
  @MaxLength(200)
  githubUrl?: string;

  @ApiPropertyOptional({ example: 'https://aminata.dev', description: 'Site, portfolio ou projet' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUrl(URL_OPTIONS, { message: 'Le lien du portfolio doit être une adresse complète (https://…).' })
  @MaxLength(200)
  portfolioUrl?: string;

  @ApiPropertyOptional({ example: 3, description: 'Années d\'expérience', minimum: 0, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({ example: '2026-12-01', description: 'Date de disponibilité (AAAA-MM-JJ)' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString({ strict: true }, { message: 'La date de disponibilité doit être au format AAAA-MM-JJ.' })
  availableFrom?: string;

  @ApiPropertyOptional({ example: 900000, description: 'Prétentions salariales mensuelles, dans expectedCurrency' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedSalary?: number;

  @ApiPropertyOptional({ example: 'XOF', description: 'Devise ISO 4217, requise avec expectedSalary' })
  @ValidateIf((dto: ApplyJobDto) => dto.expectedSalary !== undefined || dto.expectedCurrency !== undefined)
  @Transform(emptyToUndefined)
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex. XOF).' })
  expectedCurrency?: string;

  @ApiPropertyOptional({ type: [String], example: ['Angular', 'NestJS'], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10, { message: 'Maximum 10 technologies.' })
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  stack?: string[];

  @ApiPropertyOptional({ example: 'cvs/2f1c…/9a7e….pdf', description: 'Clé renvoyée par POST /upload/cv-presign' })
  @IsOptional()
  @IsString()
  cvKey?: string;
}
