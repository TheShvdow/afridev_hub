import { IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportEntityType } from '@prisma/client';

// Champs alignés sur le modèle Prisma Report : entityType (enum), entityId, reason.
export class CreateReportDto {
  @ApiProperty({ enum: ReportEntityType, example: ReportEntityType.POST })
  @IsEnum(ReportEntityType)
  entityType!: ReportEntityType;

  @ApiProperty({ example: 'cmv834cfq000590svz0oobtp7' })
  @IsString()
  entityId!: string;

  @ApiProperty({ example: 'Contenu hors sujet ou spam' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
