import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_PAGE_LIMIT } from '../../common/pipes/positive-int.pipe';
import { COUNTRY_CODES, CountryCode, toCountryCode } from '../../common/countries';

export const PROJECT_SORTS = ['newest', 'stars', 'popular', 'activity'] as const;
export type ProjectSort = (typeof PROJECT_SORTS)[number];

// FR-26 : filtres combinables, tous dans l'URL pour pouvoir la partager.
export class ListProjectsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, maximum: MAX_PAGE_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'fintech', description: 'Slug de catégorie' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'nestjs,angular', description: 'Slugs de tags séparés par des virgules (au moins un en commun)' })
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value).split(','))
      .map((item: string) => item.trim().toLowerCase())
      .filter(Boolean),
  )
  @IsString({ each: true })
  stack?: string[];

  @ApiPropertyOptional({ enum: COUNTRY_CODES, example: 'SN', description: 'Pays du projet (liste GET /api/countries)' })
  @IsOptional()
  @Transform(({ value }) => toCountryCode(value))
  @IsIn(COUNTRY_CODES, { message: 'Le pays doit être un code de la liste des pays (GET /api/countries), ex. SN.' })
  country?: CountryCode;

  @ApiPropertyOptional({
    enum: PROJECT_SORTS,
    description: 'newest : plus récents ; stars : étoiles GitHub ; popular : étoiles AfriDev Hub ; activity : dernier push',
  })
  @IsOptional()
  @IsIn(PROJECT_SORTS)
  sort?: ProjectSort = 'newest';

  @ApiPropertyOptional({ example: 'paiement' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
