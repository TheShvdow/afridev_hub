import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { Prisma, Project } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { GithubService, GithubRepoStats } from '../github/github.service';
import { resolveTagIds } from '../common/tags/resolve-tags';
import { VERIFIED_BADGE_SLUG } from '../gamification/verified-badge';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ListProjectsDto } from './dto/list-projects.dto';
import { DomainException } from '../common/errors/domain.exception';

const MODERATOR_ROLES = new Set(['ADMIN', 'MODERATOR']);
const REFRESH_COOLDOWN_MS = 60 * 60 * 1000; // bouton « rafraîchir » : une fois par heure
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProjectsViewer {
  id:   string;
  role: string;
}

// Statut de l'import GitHub renvoyé à la soumission et au rafraîchissement (FR-23).
export type GithubImport = 'imported' | 'unavailable';

const AUTHOR_SELECT = { id: true, username: true, displayName: true, avatarUrl: true } as const;

const LIST_SELECT = {
  id:             true,
  slug:           true,
  name:           true,
  description:    true,
  country:        true,
  repoUrl:        true,
  demoUrl:        true,
  githubStars:    true,
  githubForks:    true,
  githubLanguage: true,
  githubLastPush: true,
  githubSyncedAt: true,
  createdAt:      true,
  category:       { select: { name: true, slug: true } },
  user:           { select: AUTHOR_SELECT },
  projectTags:    { select: { tag: { select: { name: true, slug: true } } } },
  _count:         { select: { stars: true } },
} satisfies Prisma.ProjectSelect;

const toSlug = (name: string) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'projet';

const statsData = (repo: GithubRepoStats, now = new Date()) => ({
  githubStars:    repo.stars,
  githubForks:    repo.forks,
  githubLanguage: repo.language,
  githubLastPush: repo.pushedAt,
  githubSyncedAt: now,
});

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
    private readonly config: ConfigService,
  ) {}

  // ── Lecture publique ─────────────────────────────────────────────────

  async list(dto: ListProjectsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;

    const where: Prisma.ProjectWhereInput = { isHidden: false };
    if (dto.category)      where.category = { slug: dto.category };
    if (dto.country)       where.country = dto.country;
    if (dto.stack?.length) where.projectTags = { some: { tag: { slug: { in: dto.stack } } } };
    if (dto.search) {
      where.OR = [
        { name:        { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: this.orderBy(dto.sort),
        skip:    (page - 1) * limit,
        take:    limit,
        select:  LIST_SELECT,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data: projects, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  listCategories() {
    return this.prisma.projectCategory.findMany({ orderBy: { name: 'asc' }, select: { name: true, slug: true, icon: true } });
  }

  // FR-24 : page publique, par slug (ou par identifiant pour les anciens liens).
  async findOne(idOrSlug: string, viewer?: ProjectsViewer | null) {
    const project = await this.prisma.project.findUnique({
      where:   UUID.test(idOrSlug) ? { id: idOrSlug } : { slug: idOrSlug },
      include: {
        user:        { select: { ...AUTHOR_SELECT, reputation: true } },
        category:    { select: { name: true, slug: true } },
        projectTags: { include: { tag: true } },
        _count:      { select: { stars: true } },
      },
    });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    const canSeeHidden = !!viewer && (viewer.id === project.userId || MODERATOR_ROLES.has(viewer.role));
    if (project.isHidden && !canSeeHidden) {
      throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);
    }

    const starredByViewer = viewer
      ? !!(await this.prisma.projectStar.findUnique({ where: { userId_projectId: { userId: viewer.id, projectId: project.id } } }))
      : undefined;

    return { ...project, ogMeta: this.buildOgMeta(project), ...(viewer && { starredByViewer }) };
  }

  // ── Soumission (FR-22, FR-23, FR-27) ─────────────────────────────────

  async create(userId: string, dto: CreateProjectDto) {
    await this.requireVerifiedBadge(userId);
    const category = await this.requireCategory(dto.categorySlug);
    const { fullName, repo } = await this.checkRepo(dto.repoUrl);

    const project = await this.prisma.$transaction(
      async (tx) => {
        const tagIds = await resolveTagIds(tx, dto.tags);
        return tx.project.create({
          data: {
            name:           dto.name,
            slug:           await this.uniqueSlug(dto.name),
            description:    dto.description,
            country:        dto.country,
            repoUrl:        dto.repoUrl,
            demoUrl:        dto.demoUrl,
            userId,
            categoryId:     category.id,
            githubFullName: fullName,
            ...(repo && statsData(repo)),
            projectTags:    { create: tagIds.map((tagId) => ({ tagId })) },
          },
          select: LIST_SELECT,
        });
      },
      { timeout: 15000 },
    );

    // Échec ponctuel de GitHub : le projet est publié sans stats, la tâche de nuit les importera.
    const githubImport: GithubImport = repo ? 'imported' : 'unavailable';
    return { ...project, githubImport };
  }

  async update(projectId: string, userId: string, dto: UpdateProjectDto) {
    const project = await this.requireOwnProject(projectId, userId);

    const category = dto.categorySlug ? await this.requireCategory(dto.categorySlug) : null;
    const repoChanged = dto.repoUrl !== undefined && dto.repoUrl !== project.repoUrl;
    const checked = repoChanged ? await this.checkRepo(dto.repoUrl as string, project.id) : null;

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.tags) {
          // Les anciens tags perdent un usage, les nouveaux en gagnent un (resolveTagIds).
          const previous = await tx.projectTag.findMany({ where: { projectId }, select: { tagId: true } });
          await tx.tag.updateMany({
            where: { id: { in: previous.map((link) => link.tagId) } },
            data:  { usageCount: { decrement: 1 } },
          });
          await tx.projectTag.deleteMany({ where: { projectId } });
          const tagIds = await resolveTagIds(tx, dto.tags);
          await tx.projectTag.createMany({ data: tagIds.map((tagId) => ({ projectId, tagId })) });
        }

        return tx.project.update({
          where: { id: projectId },
          data: {
            ...(dto.name        !== undefined && { name:        dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.country     !== undefined && { country:     dto.country }),
            ...(dto.demoUrl     !== undefined && { demoUrl:     dto.demoUrl }),
            ...(category && { categoryId: category.id }),
            ...(checked && {
              repoUrl:        dto.repoUrl,
              githubFullName: checked.fullName,
              // Nouveau dépôt : les stats de l'ancien ne valent plus.
              ...(checked.repo
                ? statsData(checked.repo)
                : { githubStars: 0, githubForks: 0, githubLanguage: null, githubLastPush: null, githubSyncedAt: null }),
            }),
          },
          select: LIST_SELECT,
        });
      },
      { timeout: 15000 },
    );
  }

  async delete(projectId: string, userId: string, userRole: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    if (project.userId !== userId && !MODERATOR_ROLES.has(userRole)) {
      throw new DomainException('PROJECTS_FORBIDDEN', 'Non autorisé.', 403);
    }

    await this.prisma.project.delete({ where: { id: projectId } });
  }

  // FR-25 : une étoile par membre et par projet, second clic pour la retirer.
  async star(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.isHidden) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    const key = { userId_projectId: { userId, projectId } };
    const existing = await this.prisma.projectStar.findUnique({ where: key });

    if (existing) {
      await this.prisma.projectStar.delete({ where: key });
    } else {
      await this.prisma.projectStar.create({ data: { userId, projectId } });
    }
    const stars = await this.prisma.projectStar.count({ where: { projectId } });
    return { starred: !existing, stars };
  }

  // ── Stats GitHub ─────────────────────────────────────────────────────

  // Bouton de l'auteur (ou de la modération), une fois par heure au plus.
  async refreshStats(projectId: string, viewer: ProjectsViewer) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);
    if (project.userId !== viewer.id && !MODERATOR_ROLES.has(viewer.role)) {
      throw new DomainException('PROJECTS_FORBIDDEN', 'Non autorisé.', 403);
    }
    if (project.githubSyncedAt && Date.now() - project.githubSyncedAt.getTime() < REFRESH_COOLDOWN_MS) {
      throw new DomainException('PROJECTS_REFRESH_TOO_SOON', 'Les stats ont été mises à jour il y a moins d\'une heure.', 429);
    }

    const githubImport = await this.syncStats(project);
    const updated = await this.prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: LIST_SELECT });
    return { ...updated, githubImport };
  }

  // Chaque nuit à 3 h : stats de tous les projets. S'arrête à la limite de requêtes GitHub.
  @Cron('0 3 * * *', { name: 'projects-github-refresh' })
  async refreshAllStats(): Promise<number> {
    const projects = await this.prisma.project.findMany({
      where:   { githubFullName: { not: null } },
      orderBy: { githubSyncedAt: { sort: 'asc', nulls: 'first' } },
    });

    let refreshed = 0;
    for (const project of projects) {
      const result = await this.syncStats(project);
      if (result === 'unavailable') {
        this.logger.warn(`Import GitHub interrompu après ${refreshed} projet(s) : ajouter GITHUB_API_TOKEN relève la limite`);
        break;
      }
      refreshed += 1;
    }
    this.logger.log(`Stats GitHub rafraîchies pour ${refreshed}/${projects.length} projet(s)`);
    return refreshed;
  }

  private async syncStats(project: Project): Promise<GithubImport | 'removed'> {
    if (!project.githubFullName) return 'unavailable';
    const result = await this.github.fetchRepo(project.githubFullName);
    if (result.status === 'unavailable') return 'unavailable';
    if (result.status === 'not_found') {
      // Dépôt supprimé ou passé en privé : on garde le projet et ses dernières stats.
      this.logger.warn(`Dépôt ${project.githubFullName} introuvable (projet ${project.id})`);
      return 'removed';
    }
    await this.prisma.project.update({ where: { id: project.id }, data: statsData(result.repo) });
    return 'imported';
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  // Glossaire « Projet » et épic E4 : seul un membre au badge « dev vérifié » soumet un projet.
  private async requireVerifiedBadge(userId: string) {
    const badge = await this.prisma.userBadge.findFirst({
      where: { userId, badge: { slug: VERIFIED_BADGE_SLUG } },
    });
    if (!badge) {
      throw new DomainException(
        'PROJECTS_VERIFIED_BADGE_REQUIRED',
        'Le badge « dev vérifié » est requis pour soumettre un projet : complétez votre profil.',
        403,
      );
    }
  }

  private async requireCategory(slug: string) {
    const category = await this.prisma.projectCategory.findUnique({ where: { slug } });
    if (!category) throw new DomainException('PROJECTS_CATEGORY_NOT_FOUND', 'Catégorie introuvable.', 400);
    return category;
  }

  // FR-22 / FR-27 : URL de dépôt GitHub valide, dépôt existant et pas déjà présenté.
  // GitHub indisponible n'empêche pas la soumission (FR-23).
  private async checkRepo(repoUrl: string, excludeProjectId?: string) {
    const fullName = this.github.parseRepoUrl(repoUrl);
    if (!fullName) {
      throw new DomainException('PROJECTS_GITHUB_URL_INVALID', 'Le lien doit pointer vers un dépôt : https://github.com/<compte>/<dépôt>.', 400);
    }

    const duplicate = await this.prisma.project.findFirst({
      where:  { githubFullName: fullName, ...(excludeProjectId && { id: { not: excludeProjectId } }) },
      select: { id: true },
    });
    if (duplicate) {
      throw new DomainException('PROJECTS_REPO_ALREADY_SUBMITTED', 'Ce dépôt est déjà présenté dans la vitrine.', 409);
    }

    const result = await this.github.fetchRepo(fullName);
    if (result.status === 'not_found') {
      throw new DomainException('PROJECTS_GITHUB_REPO_NOT_FOUND', 'Dépôt GitHub introuvable ou privé.', 422);
    }
    return { fullName, repo: result.status === 'ok' ? result.repo : null };
  }

  private async requireOwnProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);
    if (project.userId !== userId) throw new DomainException('PROJECTS_FORBIDDEN', 'Non autorisé.', 403);
    return project;
  }

  // Slug tiré du nom ; suffixe aléatoire court en cas de collision.
  private async uniqueSlug(name: string) {
    const base = toSlug(name);
    const taken = await this.prisma.project.findUnique({ where: { slug: base }, select: { id: true } });
    return taken ? `${base}-${randomBytes(3).toString('hex')}` : base;
  }

  private orderBy(sort: ListProjectsDto['sort']): Prisma.ProjectOrderByWithRelationInput[] {
    switch (sort) {
      case 'stars':    return [{ githubStars: 'desc' }, { createdAt: 'desc' }];
      case 'popular':  return [{ stars: { _count: 'desc' } }, { createdAt: 'desc' }];
      case 'activity': return [{ githubLastPush: { sort: 'desc', nulls: 'last' } }];
      default:         return [{ createdAt: 'desc' }];
    }
  }

  // FR-24 : partage sur les réseaux. Image : carte Open Graph générée par GitHub pour le dépôt.
  private buildOgMeta(project: { name: string; slug: string; description: string; githubFullName: string | null; user: { avatarUrl: string | null } }) {
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');
    return {
      ogTitle:       `${project.name} — AfriDev Hub`,
      ogDescription: project.description.replace(/\s+/g, ' ').trim().slice(0, 160),
      ogImage:       project.githubFullName
        ? `https://opengraph.githubassets.com/1/${project.githubFullName}`
        : project.user.avatarUrl,
      ogUrl:         `${webUrl}/projects/${project.slug}`,
    };
  }
}
