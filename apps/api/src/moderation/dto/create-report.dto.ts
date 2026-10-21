import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportEntityType } from '@prisma/client';

// FR-20 : raison choisie dans une liste prédéfinie.
export const REPORT_REASONS = ['SPAM', 'OFFENSIVE', 'OFF_TOPIC', 'DUPLICATE', 'OTHER'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Champs alignés sur le modèle Prisma Report : entityType (enum), entityId, reason.
export class CreateReportDto {
  @ApiProperty({ enum: ReportEntityType, example: ReportEntityType.POST })
  @IsEnum(ReportEntityType)
  entityType!: ReportEntityType;

  @ApiProperty({ example: 'cmv834cfq000590svz0oobtp7' })
  @IsString()
  entityId!: string;

  @ApiProperty({ enum: REPORT_REASONS, example: 'SPAM' })
  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @ApiPropertyOptional({ example: 'Lien publicitaire répété dans trois questions', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  details?: string;
}
