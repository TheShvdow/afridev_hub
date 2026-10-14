import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsPositive,
  MinLength,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum JobType {
  FULL_TIME  = 'FULL_TIME',
  PART_TIME  = 'PART_TIME',
  CONTRACT   = 'CONTRACT',
  FREELANCE  = 'FREELANCE',
  INTERNSHIP = 'INTERNSHIP',
}

export enum WorkMode {
  REMOTE  = 'REMOTE',
  ONSITE  = 'ONSITE',
  HYBRID  = 'HYBRID',
}

export class CreateJobDto {
  @ApiProperty({ example: 'Développeur Angular Senior' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Nous recherchons un développeur Angular senior...' })
  @IsString()
  @MinLength(100)
  @MaxLength(20000)
  description!: string;

  @ApiProperty({ example: 'TechStartup Dakar' })
  @IsString()
  @MaxLength(100)
  company!: string;

  @ApiPropertyOptional({ example: 'Dakar, Sénégal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type!: JobType;

  @ApiProperty({ enum: WorkMode })
  @IsEnum(WorkMode)
  workMode!: WorkMode;

  @ApiPropertyOptional({ example: 800000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryMin?: number;

  @ApiPropertyOptional({ example: 1500000 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  salaryMax?: number;

  @ApiPropertyOptional({ example: 'XOF' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: ['angular', 'typescript', 'ngrx'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  techStack?: string[];
}
