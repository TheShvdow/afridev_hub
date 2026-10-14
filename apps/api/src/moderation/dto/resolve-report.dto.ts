import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationActionType } from '@prisma/client';

export class ResolveReportDto {
  @ApiProperty({ enum: ModerationActionType })
  @IsEnum(ModerationActionType)
  action!: ModerationActionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
