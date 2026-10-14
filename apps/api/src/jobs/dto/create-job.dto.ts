import {
  IsString,
  IsEnum,
  IsInt,
  IsPositive,
  IsArray,
  Matches,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { JobMode, JobType } from '@prisma/client';

// Règles : BMAD glossaire « Offre » — stack 1 à 5 tags, pays, mode, salaire obligatoire
// (montant + devise), expiration à J60. Type de contrat conservé (décision 2026-10-14).
// Champs alignés sur le modèle Prisma JobOffer : country, mode, stack, currency, salaryMin/Max.
export class CreateJobDto {
  @ApiProperty({ example: 'Développeur Angular Senior' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Nous recherchons un développeur Angular senior pour…' })
  @IsString()
  @MinLength(100)
  @MaxLength(20000)
  description!: string;

  @ApiProperty({ example: 'TechStartup Dakar' })
  @IsString()
  @MaxLength(100)
  company!: string;

  @ApiProperty({ example: 'SN', description: 'Code pays ISO 3166-1 alpha-2' })
  @Matches(/^[A-Z]{2}$/, { message: 'Le pays doit être un code ISO 3166-1 alpha-2 (ex. SN).' })
  country!: string;

  @ApiProperty({ enum: JobType, example: JobType.FULL_TIME })
  @IsEnum(JobType)
  type!: JobType;

  @ApiProperty({ enum: JobMode, example: JobMode.REMOTE })
  @IsEnum(JobMode)
  mode!: JobMode;

  @ApiProperty({ example: 500000, description: 'Montant minimum, en unités de base (entier)' })
  @IsInt()
  @IsPositive()
  salaryMin!: number;

  @ApiProperty({ example: 800000, description: 'Montant maximum, en unités de base (entier)' })
  @IsInt()
  @IsPositive()
  salaryMax!: number;

  @ApiProperty({ example: 'XOF', description: 'Code devise ISO 4217' })
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex. XOF).' })
  currency!: string;

  @ApiProperty({ example: ['angular', 'typescript', 'ngrx'], minItems: 1, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins 1 technologie est requise.' })
  @ArrayMaxSize(5, { message: 'Maximum 5 technologies par offre.' })
  @IsString({ each: true })
  stack!: string[];
}
