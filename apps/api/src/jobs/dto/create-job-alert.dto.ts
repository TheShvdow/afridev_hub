import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Min, MaxLength, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobMode } from '@prisma/client';

// FR-32 : critères d'une alerte emploi. Un critère absent accepte toutes les valeurs.
export class CreateJobAlertDto {
  @ApiPropertyOptional({ example: 'SN', description: 'Code pays ISO 3166-1 alpha-2' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  country?: string;

  @ApiPropertyOptional({ enum: JobMode })
  @IsOptional()
  @IsEnum(JobMode)
  mode?: JobMode;

  @ApiPropertyOptional({ example: ['angular', 'nestjs'], maxItems: 5, description: 'Au moins une technologie en commun' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  stack?: string[];

  @ApiPropertyOptional({ example: 300000, description: 'Salaire minimum, dans la devise `currency`' })
  @IsOptional()
  @IsInt()
  @Min(1)
  salaryMin?: number;

  @ApiPropertyOptional({ example: 'XOF', description: 'Obligatoire avec salaryMin' })
  @ValidateIf((dto: CreateJobAlertDto) => dto.salaryMin !== undefined || dto.currency !== undefined)
  @Matches(/^[A-Z]{3}$/, { message: 'La devise doit être un code ISO 4217 (ex. XOF).' })
  currency?: string;
}
