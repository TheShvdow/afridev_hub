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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

class CreateReportDto {
  @ApiProperty() @IsString() targetType!: string;
  @ApiProperty() @IsString() targetId!: string;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
}

class ResolveReportDto {
  @ApiProperty() @IsString() action!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

class BanUserDto {
  @ApiProperty() @IsString() userId!: string;
  @ApiProperty() @IsString() reason!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() until?: string;
}

@ApiTags('Moderation')
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Post('reports')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Signaler un contenu' })
  createReport(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReportDto,
  ) {
    return this.moderationService.createReport(
      userId, dto.targetType, dto.targetId, dto.reason, dto.description,
    );
  }

  @Get('reports')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les signalements [MODERATOR]' })
  listReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
  ) {
    return this.moderationService.listReports(status, Number(page) || 1);
  }

  @Patch('reports/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Résoudre un signalement [MODERATOR]' })
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
    const until = dto.until ? new Date(dto.until) : undefined;
    return this.moderationService.banUser(dto.userId, moderatorId, dto.reason, until);
  }

  @Patch('users/:userId/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Débannir un utilisateur [MODERATOR]' })
  unbanUser(@Param('userId') userId: string) {
    return this.moderationService.unbanUser(userId);
  }
}
