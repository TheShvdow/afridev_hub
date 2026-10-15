import {
  Controller,
  Get,
  Param,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import { PositiveIntPipe, MAX_PAGE_LIMIT } from '../common/pipes/positive-int.pipe';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { ApiData } from '../common/swagger/api-data.decorator';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Classement par réputation' })
  @ApiData({ array: true, description: 'Classement par réputation' })
  leaderboard(
    @Query('page', new DefaultValuePipe(1), new PositiveIntPipe()) page: number,
    @Query('limit', new DefaultValuePipe(50), new PositiveIntPipe(MAX_PAGE_LIMIT)) limit: number,
  ) {
    return this.gamificationService.getLeaderboard(page, limit);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Liste de tous les badges' })
  @ApiData({ array: true, description: 'Badges disponibles' })
  listBadges() {
    return this.gamificationService.listBadges();
  }

  @Get('users/:userId/reputation')
  @ApiOperation({ summary: 'Réputation et historique d\'un utilisateur' })
  @ApiData({ description: 'Réputation et historique' })
  userReputation(@Param('userId') userId: string) {
    return this.gamificationService.getUserReputation(userId);
  }
}
