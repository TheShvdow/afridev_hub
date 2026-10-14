import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseEnumPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JobMode, JobType } from '@prisma/client';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { JobDto, JobApplicationDto } from '../common/swagger/models';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les offres d\'emploi' })
  @ApiQuery({ name: 'type', enum: JobType, required: false })
  @ApiQuery({ name: 'mode', enum: JobMode, required: false })
  @ApiData({ type: JobDto, paginated: true, description: 'Offres actives, paginées' })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type', new ParseEnumPipe(JobType, { optional: true })) type?: JobType,
    @Query('mode', new ParseEnumPipe(JobMode, { optional: true })) mode?: JobMode,
    @Query('search') search?: string,
  ) {
    return this.jobsService.list(page, limit, type, mode, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une offre' })
  @ApiData({ type: JobDto })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publier une offre d\'emploi' })
  @ApiData({ type: JobDto, status: 201, description: 'Offre publiée' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobsService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une offre (auteur uniquement)' })
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

  @Post(':id/apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Postuler à une offre' })
  @ApiData({ type: JobApplicationDto, status: 201, description: 'Candidature enregistrée' })
  @ApiResponse({ status: 409, description: 'Déjà candidaté à cette offre' })
  apply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.apply(id, userId, dto.message, dto.cvUrl);
  }

  @Get(':id/applications')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Voir les candidatures (recruteur uniquement)' })
  @ApiData({ type: JobApplicationDto, array: true, description: 'Candidatures (auteur de l\'offre uniquement)' })
  getApplications(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.jobsService.getApplications(id, userId);
  }
}
