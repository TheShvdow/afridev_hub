import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAnswerDto {
  @ApiProperty({ example: 'Pour configurer Nx avec Angular 18 + SSR, il faut...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  body!: string;
}
