import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Idrissa Wade' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @ApiPropertyOptional({ example: 'Développeur fullstack à Dakar 🇸🇳' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Dakar, Sénégal' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'https://idrissawade.dev' })
  @IsOptional()
  @IsUrl({}, { message: 'URL de site web invalide.' })
  websiteUrl?: string;

  @ApiPropertyOptional({ example: 'idrissa_gh' })
  @IsOptional()
  @IsString()
  @MaxLength(39)
  githubUsername?: string;

  @ApiPropertyOptional({ example: 'idrissa_li' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkedinUsername?: string;

  @ApiPropertyOptional({ example: 'idrissa_twitter' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  twitterUsername?: string;
}
