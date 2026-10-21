import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  IsIn,
  MinLength,
  MaxLength,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COUNTRY_CODES, CountryCode, toCountryCode } from '../../common/countries';
import { Transform } from 'class-transformer';

// Règles : BMAD glossaire « Projet » — description ≥ 50, stack 1 à 5 tags, lien GitHub requis.
// Champs alignés sur le modèle Prisma Project : name, description, country, repoUrl, demoUrl
// (tags → ProjectTag, categorySlug → ProjectCategory.slug).
export class CreateProjectDto {
  @ApiProperty({ example: 'AfriPay — Paiements mobiles unifiés' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Solution open-source pour intégrer Wave, Orange Money et MTN MoMo…' })
  @IsString()
  @MinLength(50, { message: 'La description doit contenir au moins 50 caractères.' })
  @MaxLength(10000)
  description!: string;

  @ApiProperty({ enum: COUNTRY_CODES, example: 'SN', description: 'Code pays de la liste GET /api/countries' })
  @Transform(({ value }) => toCountryCode(value))
  @IsIn(COUNTRY_CODES, { message: 'Le pays doit être un code de la liste des pays (GET /api/countries), ex. SN.' })
  country!: CountryCode;

  // Vérifié dans le service : https://github.com/<owner>/<repo>, dépôt existant (FR-22, FR-27).
  @ApiProperty({ example: 'https://github.com/TheShvdow/afridev_hub' })
  @IsUrl()
  repoUrl!: string;

  @ApiPropertyOptional({ example: 'https://afripay.demo.com' })
  @IsOptional()
  @IsUrl()
  demoUrl?: string;

  @ApiProperty({ example: ['typescript', 'nestjs', 'wave-api'], minItems: 1, maxItems: 5 })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins 1 technologie est requise.' })
  @ArrayMaxSize(5, { message: 'Maximum 5 technologies par projet.' })
  @IsString({ each: true })
  tags!: string[];

  // FR-22 : catégorie obligatoire, choisie dans la liste prédéfinie (GET /projects/categories).
  @ApiProperty({ example: 'fintech' })
  @IsString()
  categorySlug!: string;
}
