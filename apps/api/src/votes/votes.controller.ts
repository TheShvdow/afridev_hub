import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VotesService } from './votes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class VoteDto {
  @ApiProperty({ enum: [1, -1] })
  @IsIn([1, -1])
  value!: 1 | -1;
}

@ApiTags('Votes')
@Controller('votes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post('posts/:id')
  @ApiOperation({ summary: 'Voter pour une question' })
  votePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body() dto: VoteDto,
  ) {
    return this.votesService.vote(userId, 'POST', postId, dto.value);
  }

  @Post('answers/:id')
  @ApiOperation({ summary: 'Voter pour une réponse' })
  voteAnswer(
    @CurrentUser('id') userId: string,
    @Param('id') answerId: string,
    @Body() dto: VoteDto,
  ) {
    return this.votesService.vote(userId, 'ANSWER', answerId, dto.value);
  }
}
