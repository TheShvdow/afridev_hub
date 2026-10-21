import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProjectsService, ProjectsViewer } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiData } from '../common/swagger/api-data.decorator';
import { ProjectDto } from '../common/swagger/models';
import { ProjectCategoryDto, StarResultDto } from '../common/swagger/models-extra';

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les projets (filtres combinables : catégorie, stack, pays, tri)' })
  @ApiData({ type: ProjectDto, paginated: true, description: 'Projets visibles, paginés' })
  list(@Query() query: ListProjectsDto) {
    return this.projectsService.list(query);
  }

  // Avant :idOrSlug pour ne pas être capturée par le paramètre.
  @Get('categories')
  @ApiOperation({ summary: 'Catégories de projets (liste prédéfinie)' })
  @ApiData({ type: ProjectCategoryDto, array: true, description: 'Catégories de projets' })
  listCategories() {
    return this.projectsService.listCategories();
  }

  @Get(':idOrSlug')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Page publique d\'un projet, par slug (ou identifiant), avec métadonnées Open Graph' })
  @ApiData({ type: ProjectDto })
  findOne(@Param('idOrSlug') idOrSlug: string, @CurrentUser() viewer: ProjectsViewer | null) {
    return this.projectsService.findOne(idOrSlug, viewer);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soumettre un projet (badge « dev vérifié » requis, dépôt GitHub vérifié)' })
  @ApiData({ type: ProjectDto, status: 201, description: 'Projet publié ; githubImport indique si les stats ont été importées' })
  @ApiResponse({ status: 422, description: 'Dépôt GitHub introuvable ou privé' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un projet (auteur uniquement)' })
  @ApiData({ type: ProjectDto, description: 'Projet mis à jour' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer un projet (auteur, modérateur ou admin)' })
  delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projectsService.delete(id, userId, role);
  }

  @Post(':id/star')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Étoiler / retirer son étoile (toggle)' })
  @ApiData({ type: StarResultDto, status: 201, description: 'Étoile ajoutée ou retirée, nouveau total' })
  star(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.star(id, userId);
  }

  @Post(':id/refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rafraîchir les stats GitHub (auteur ou modération, une fois par heure)' })
  @ApiData({ type: ProjectDto, description: 'Projet avec ses stats ; githubImport indique le résultat' })
  @ApiResponse({ status: 429, description: 'Dernier rafraîchissement il y a moins d\'une heure' })
  refresh(@Param('id') id: string, @CurrentUser() viewer: ProjectsViewer) {
    return this.projectsService.refreshStats(id, viewer);
  }
}
