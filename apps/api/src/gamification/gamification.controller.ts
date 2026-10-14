import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard')
  @ApiOperation({ summary: 'Classement par réputation' })
  leaderboard(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.gamificationService.getLeaderboard(page, limit);
  }

  @Get('badges')
  @ApiOperation({ summary: 'Liste de tous les badges' })
  listBadges() {
    return this.gamificationService.listBadges();
  }

  @Get('users/:userId/reputation')
  @ApiOperation({ summary: 'Réputation et historique d\'un utilisateur' })
  userReputation(@Param('userId') userId: string) {
    return this.gamificationService.getUserReputation(userId);
  }
}
