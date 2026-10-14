import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoteValue } from '@prisma/client';

// Valeur alignée sur l'enum Prisma VoteValue (UP | DOWN).
// Règle métier : +1 (UP) / −1 (DOWN), toggle si le même vote est renvoyé.
export class VoteDto {
  @ApiProperty({ enum: VoteValue, example: VoteValue.UP })
  @IsEnum(VoteValue)
  value!: VoteValue;
}
