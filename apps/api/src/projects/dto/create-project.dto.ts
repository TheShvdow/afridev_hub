import {
  IsString,
  IsOptional,
  IsArray,
  IsUrl,
  MinLength,
  MaxLength,
  ArrayMaxSize,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'AfriPay — Paiements mobiles unifiés' })
  @IsString()
  @MinLength(5)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 'Solution open-source pour intégrer Wave, Orange Money et MTN MoMo...' })
  @IsString()
  @MinLength(50)
  @MaxLength(10000)
  description!: string;

  @ApiPropertyOptional({ example: 'https://repo.afridevhub.com/afripay' })
  @IsOptional()
  @IsUrl()
  repoUrl?: string;

  @ApiPropertyOptional({ example: 'https://afripay.demo.com' })
  @IsOptional()
  @IsUrl()
  demoUrl?: string;

  @ApiPropertyOptional({ example: ['typescript', 'nestjs', 'wave-api'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(8)
  techStack?: string[];

  @ApiPropertyOptional({ example: 'fintech' })
  @IsOptional()
  @IsString()
  categorySlug?: string;
}
