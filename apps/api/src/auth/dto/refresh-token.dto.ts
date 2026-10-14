import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token reçu au login ou au refresh précédent' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
