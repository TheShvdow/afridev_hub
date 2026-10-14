import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerDto {
  @ApiProperty({ example: 'Pour configurer Nx avec Angular 18 + SSR, il faut...' })
  @IsString()
  @MinLength(30, { message: 'La réponse doit contenir au moins 30 caractères.' })
  @MaxLength(50000)
  body!: string;
}
