import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimilarPostsDto {
  @ApiProperty({ example: 'Comment configurer Nx avec Angular' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;
}
