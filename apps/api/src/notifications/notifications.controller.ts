import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PositiveIntPipe, MAX_PAGE_LIMIT } from '../common/pipes/positive-int.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ApiData } from '../common/swagger/api-data.decorator';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiData({ paginated: true, description: 'Notifications, les plus récentes d\'abord' })
  @ApiOperation({ summary: 'Mes notifications' })
  list(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), new PositiveIntPipe()) page: number,
    @Query('limit', new DefaultValuePipe(20), new PositiveIntPipe(MAX_PAGE_LIMIT)) limit: number,
  ) {
    return this.notificationsService.list(userId, page, limit);
  }

  @Get('unread-count')
  @ApiResponse({ status: 200, description: 'Nombre de notifications non lues', schema: { type: 'object', required: ['data'], properties: { data: { type: 'object', required: ['count'], properties: { count: { type: 'number', example: 3 } } } } } })
  @ApiOperation({ summary: 'Nombre de notifications non lues' })
  async unreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  markAsRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Tout marquer comme lu' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }
}
