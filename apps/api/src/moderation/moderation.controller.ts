import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportStatus } from '@prisma/client';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { ReportDto } from '../common/swagger/models';

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Signaler un contenu' })
  @ApiData({ type: ReportDto, status: 201, description: 'Signalement créé' })
  createReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.createReport(
      userId, dto.entityType, dto.entityId, dto.reason,
      // description removed — no such field
    );
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les signalements [MODERATOR]' })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  listReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.moderationService.listReports(status as never, Number(page) || 1);
  }

  @Patch('reports/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Résoudre un signalement [MODERATOR]' })
  @ApiData({ type: ReportDto, description: 'Signalement résolu' })
  resolveReport(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ResolveReportDto,
  ) {
    return this.moderationService.resolveReport(id, userId, dto.action, dto.note);
  }

  @Post('users/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bannir un utilisateur [MODERATOR]' })
  banUser(@CurrentUser('id') moderatorId: string, @Body() dto: BanUserDto) {
    // `until` removed — no bannedUntil on User; ModerationAction tracks the ban
    return this.moderationService.banUser(dto.userId, moderatorId, dto.reason);
  }

  @Patch('users/:userId/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Débannir un utilisateur [MODERATOR]' })
  unbanUser(
    @Param('userId') userId: string,
    @CurrentUser('id') moderatorId: string,   // needed — service now requires moderatorId
  ) {
    return this.moderationService.unbanUser(userId, moderatorId);
  }
}
