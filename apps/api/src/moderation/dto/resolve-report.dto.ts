import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationActionType } from '@prisma/client';

// Décisions possibles sur un contenu signalé. Le ban passe par /moderation/users/ban,
// l'abandon du signalement par /moderation/reports/:id/dismiss.
export const REPORT_RESOLUTIONS = [
  ModerationActionType.HIDDEN,
  ModerationActionType.RESTORED,
  ModerationActionType.WARNING,
] as const;
export type ReportResolution = (typeof REPORT_RESOLUTIONS)[number];

export class ResolveReportDto {
  @ApiProperty({ enum: REPORT_RESOLUTIONS })
  @IsIn(REPORT_RESOLUTIONS)
  action!: ReportResolution;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
