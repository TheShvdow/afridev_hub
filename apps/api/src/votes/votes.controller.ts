import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VoteValue } from '@prisma/client';
import { VotesService } from './votes.service';
import { VoteDto } from './dto/vote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Le service travaille en +1 / −1 ; la conversion depuis l'enum Prisma se fait ici.
const toScore = (value: VoteValue): 1 | -1 => (value === VoteValue.UP ? 1 : -1);

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
    return this.votesService.vote(userId, 'POST', postId, toScore(dto.value));
  }

  @Post('answers/:id')
  @ApiOperation({ summary: 'Voter pour une réponse' })
  voteAnswer(
    @CurrentUser('id') userId: string,
    @Param('id') answerId: string,
    @Body() dto: VoteDto,
  ) {
    return this.votesService.vote(userId, 'ANSWER', answerId, toScore(dto.value));
  }
}
