import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { PositiveIntPipe } from '../common/pipes/positive-int.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportEntityType, ReportStatus } from '@prisma/client';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';
import { BanUserDto } from './dto/ban-user.dto';
import { ModerationNoteDto } from './dto/moderation-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { ReportDto, SuccessDto } from '../common/swagger/models';
import { ApiPaginationQuery } from '../common/swagger/api-pagination.decorator';
import { ModerationActionDto } from '../common/swagger/models-extra';

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
    return this.moderationService.createReport(userId, dto);
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les signalements [MODERATOR]' })
  @ApiData({ type: ReportDto, paginated: true, description: 'Signalements paginés' })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  @ApiPaginationQuery({ defaultLimit: false })
  listReports(
    @Query('status') status: string | undefined,
    @Query('page', new DefaultValuePipe(1), new PositiveIntPipe()) page: number,
  ) {
    return this.moderationService.listReports(status as never, page);
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

  @Patch('reports/:id/dismiss')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ignorer un signalement [MODERATOR]' })
  @ApiData({ type: ReportDto, description: 'Signalement ignoré, contenu de nouveau visible' })
  dismissReport(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ModerationNoteDto,
  ) {
    return this.moderationService.dismissReport(id, userId, dto.note);
  }

  @Patch('content/:entityType/:entityId/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restaurer un contenu masqué [MODERATOR]' })
  @ApiData({ type: SuccessDto, description: 'Contenu restauré' })
  restoreContent(
    @Param('entityType', new ParseEnumPipe(ReportEntityType)) entityType: ReportEntityType,
    @Param('entityId') entityId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ModerationNoteDto,
  ) {
    return this.moderationService.restoreContent(entityType, entityId, userId, dto.note);
  }

  @Post('users/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bannir un utilisateur [MODERATOR]' })
  @ApiData({ type: ModerationActionDto, status: 201, description: 'Action de ban enregistrée' })
  banUser(@CurrentUser('id') moderatorId: string, @Body() dto: BanUserDto) {
    // `until` removed — no bannedUntil on User; ModerationAction tracks the ban
    return this.moderationService.banUser(dto.userId, moderatorId, dto.reason);
  }

  @Patch('users/:userId/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Débannir un utilisateur [MODERATOR]' })
  @ApiData({ type: ModerationActionDto, description: 'Action de levée du ban enregistrée' })
  unbanUser(
    @Param('userId') userId: string,
    @CurrentUser('id') moderatorId: string,   // needed — service now requires moderatorId
  ) {
    return this.moderationService.unbanUser(userId, moderatorId);
  }
}
