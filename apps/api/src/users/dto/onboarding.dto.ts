import { IsArray, IsOptional, IsString, Matches, ArrayMaxSize, MaxLength, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Onboarding (story E2-4) : ne remplit que les champs encore vides ; un champ déjà renseigné n'est jamais écrasé.
export class OnboardingDto {
  @ApiPropertyOptional({ example: 'Dakar' })
  @IsOptional() @IsString() @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ example: 'SN' })
  @IsOptional() @Matches(/^[A-Z]{2}$/, { message: 'Le pays doit être un code ISO 3166-1 alpha-2 (ex. SN).' })
  country?: string;

  @ApiPropertyOptional({ example: ['TypeScript', 'NestJS'] })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MinLength(1, { each: true }) @MaxLength(30, { each: true })
  stack?: string[];
}
