import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
} from '@nestjs/common';
import { PositiveIntPipe, MAX_PAGE_LIMIT } from '../common/pipes/positive-int.pipe';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JobsService, JobsViewer } from './jobs.service';
import { JobAlertsService } from './job-alerts.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { RejectJobDto } from './dto/reject-job.dto';
import { CreateJobAlertDto } from './dto/create-job-alert.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { JobDto, JobApplicationDto, JobAlertDto, RecruiterPlanDto } from '../common/swagger/models';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly alerts: JobAlertsService,
  ) {}

  // Les routes à segment fixe (mine, plan, review, alerts) précèdent :id.

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Lister les offres publiées (filtres combinables, salaires convertis)' })
  @ApiData({ type: JobDto, paginated: true, description: 'Offres actives, paginées' })
  list(@Query() query: ListJobsDto, @CurrentUser() viewer: JobsViewer | null) {
    return this.jobsService.list(query, viewer);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes offres, tous statuts confondus (tableau de bord recruteur)' })
  @ApiData({ type: JobDto, array: true })
  listMine(@CurrentUser('id') userId: string) {
    return this.jobsService.listMine(userId);
  }

  @Get('plan')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Plan recruteur et quota d\'offres du mois' })
  @ApiData({ type: RecruiterPlanDto })
  getPlan(@CurrentUser('id') userId: string) {
    return this.jobsService.getPlan(userId);
  }

  @Get('review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Offres en attente de validation [MODERATOR]' })
  @ApiData({ type: JobDto, paginated: true })
  listPendingReview(
    @Query('page', new DefaultValuePipe(1), new PositiveIntPipe()) page: number,
    @Query('limit', new DefaultValuePipe(20), new PositiveIntPipe(MAX_PAGE_LIMIT)) limit: number,
  ) {
    return this.jobsService.listPendingReview(page, limit);
  }

  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes alertes emploi' })
  @ApiData({ type: JobAlertDto, array: true })
  listAlerts(@CurrentUser('id') userId: string) {
    return this.alerts.list(userId);
  }

  @Post('alerts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer une alerte emploi (5 au plus)' })
  @ApiData({ type: JobAlertDto, status: 201 })
  createAlert(@CurrentUser('id') userId: string, @Body() dto: CreateJobAlertDto) {
    return this.alerts.create(userId, dto);
  }

  @Delete('alerts/:alertId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une alerte emploi' })
  removeAlert(@CurrentUser('id') userId: string, @Param('alertId') alertId: string) {
    return this.alerts.remove(userId, alertId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Détail d\'une offre' })
  @ApiQuery({ name: 'currency', required: false, example: 'NGN' })
  @ApiData({ type: JobDto })
  findOne(
    @Param('id') id: string,
    @CurrentUser() viewer: JobsViewer | null,
    @Query('currency') currency?: string,
  ) {
    return this.jobsService.findOne(id, viewer, /^[A-Z]{3}$/.test(currency ?? '') ? currency : undefined);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soumettre une offre (profil recruteur requis, validée par la modération)' })
  @ApiData({ type: JobDto, status: 201, description: 'Offre en attente de validation' })
  @ApiResponse({ status: 402, description: 'Quota du plan gratuit atteint (JOBS_PLAN_LIMIT_REACHED)' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une offre (auteur uniquement ; une offre refusée repart en validation)' })
  @ApiData({ type: JobDto, description: 'Offre mise à jour' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(id, userId, dto);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fermer une offre (auteur uniquement)' })
  @ApiData({ type: JobDto, description: 'Offre fermée' })
  close(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobsService.close(id, userId);
  }

  @Patch(':id/renew')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renouveler une offre pour 60 jours (auteur uniquement)' })
  @ApiData({ type: JobDto, description: 'Offre renouvelée' })
  renew(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobsService.renew(id, userId);
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Valider une offre [MODERATOR]' })
  @ApiData({ type: JobDto, description: 'Offre publiée' })
  approve(@Param('id') id: string, @CurrentUser('id') moderatorId: string) {
    return this.jobsService.approve(id, moderatorId);
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('MODERATOR', 'ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refuser une offre avec un motif [MODERATOR]' })
  @ApiData({ type: JobDto, description: 'Offre refusée' })
  reject(
    @Param('id') id: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: RejectJobDto,
  ) {
    return this.jobsService.reject(id, moderatorId, dto.reason);
  }

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Postuler à une offre (CV PDF optionnel)' })
  @ApiData({ type: JobApplicationDto, status: 201, description: 'Candidature enregistrée' })
  @ApiResponse({ status: 409, description: 'Déjà candidaté à cette offre' })
  apply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.apply(id, userId, dto);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voir les candidatures (auteur ; profils complets en premium)' })
  @ApiData({ type: JobApplicationDto, array: true, description: 'Candidatures (auteur de l\'offre uniquement)' })
  getApplications(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.getApplications(id, userId);
  }
}
