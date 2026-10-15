import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { ApiData } from '../common/swagger/api-data.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques du dashboard [ADMIN]' })
  @ApiData({ description: 'Statistiques du dashboard' })
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'Lister tous les utilisateurs [ADMIN]' })
  @ApiData({ paginated: true, description: 'Utilisateurs paginés' })
  listUsers(
    @Query('page') page?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers(Number(page) || 1, 30, search);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Modifier le rôle d\'un utilisateur [ADMIN]' })
  @ApiData({ description: 'Utilisateur mis à jour' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminService.updateUserRole(id, dto.role);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'Journal d\'audit [ADMIN]' })
  @ApiData({ paginated: true, description: 'Entrées du journal d\'audit' })
  getAuditLog(@Query('page') page?: string) {
    return this.adminService.getAuditLog(Number(page) || 1);
  }
}
