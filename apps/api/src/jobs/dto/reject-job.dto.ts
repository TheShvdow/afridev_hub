import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectJobDto {
  @ApiProperty({ example: 'Le salaire indiqué ne correspond pas au poste.' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason!: string;
}
