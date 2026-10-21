import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Glossaire « Recruteur » : un Membre avec un profil entreprise.
export class RecruiterProfileDto {
  @ApiProperty({ example: 'TechStartup Dakar' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  companyName!: string;
}
