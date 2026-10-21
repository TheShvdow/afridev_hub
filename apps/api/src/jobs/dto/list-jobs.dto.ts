import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobMode, JobType } from '@prisma/client';
import { MAX_PAGE_LIMIT } from '../../common/pipes/positive-int.pipe';

// FR-29 : filtres combinables, tous dans l'URL pour pouvoir la partager.
export class ListJobsDto {
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

  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({ enum: JobMode })
  @IsOptional()
  @IsEnum(JobMode)
  mode?: JobMode;

  @ApiPropertyOptional({ example: 'SN', description: 'Code pays ISO 3166-1 alpha-2' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  @ApiPropertyOptional({ example: 'angular,nestjs', description: 'Technologies séparées par des virgules (au moins une en commun)' })
  @IsOptional()
  @Transform(({ value }) =>
    (Array.isArray(value) ? value : String(value).split(','))
      .map((item: string) => item.trim().toLowerCase())
      .filter(Boolean),
  )
  @IsString({ each: true })
  stack?: string[];

  @ApiPropertyOptional({ example: 300000, description: 'Salaire minimum souhaité, dans la devise `currency`' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  salaryMin?: number;

  @ApiPropertyOptional({ example: 'XOF', description: 'Devise d\'affichage et du filtre salaire. Par défaut : devise préférée du membre, sinon XOF.' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currency?: string;

  @ApiPropertyOptional({ example: 'angular' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
