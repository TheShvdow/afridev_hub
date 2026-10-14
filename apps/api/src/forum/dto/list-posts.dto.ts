import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPostsDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'newest', enum: ['newest', 'votes', 'unanswered', 'active'] })
  @IsOptional()
  @IsIn(['newest', 'votes', 'unanswered', 'active'])
  sort?: 'newest' | 'votes' | 'unanswered' | 'active' = 'newest';

  @ApiPropertyOptional({ example: 'angular' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({ example: 'Nx monorepo' })
  @IsOptional()
  @IsString()
  search?: string;
}
