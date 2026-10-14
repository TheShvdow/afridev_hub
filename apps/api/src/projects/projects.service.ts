import {
  Injectable,
  } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { Prisma } from '@prisma/client';
import { DomainException } from '../common/errors/domain.exception';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 20, categorySlug?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {
    const where: Prisma.ProjectWhereInput = {
      isApproved: true,
    };

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        select: {
          id:          true,
          name:        true,
          description: true,
          country:     true,
          repoUrl:     true,
          demoUrl:     true,
          isApproved:  true,
          createdAt:   true,
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          projectTags: {
            select: { tag: { select: { name: true, slug: true } } },
          },
          _count: { select: { stars: true } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: projects,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
        },
        projectTags: { include: { tag: true } },
        _count: { select: { stars: true } },
      },
    });

    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);
    if (!project.isApproved) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    const category = dto.categorySlug
      ? await this.prisma.projectCategory.findUnique({ where: { slug: dto.categorySlug } })
      : null;
    if (dto.categorySlug && !category) {
      throw new DomainException('PROJECTS_CATEGORY_NOT_FOUND', 'Catégorie introuvable.', 400);
    }

    return this.prisma.project.create({
      data: {
        name:        dto.name,
        description: dto.description,
        country:     dto.country,
        repoUrl:     dto.repoUrl,
        demoUrl:     dto.demoUrl,
        userId,
        categoryId:  category?.id,
        isApproved:  false,          // Requires admin approval
        projectTags: { create: await this.upsertTags(dto.tags) },
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        projectTags: { include: { tag: true } },
      },
    });
  }

  async update(projectId: string, userId: string, dto: Partial<CreateProjectDto>) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);
    if (project.userId !== userId) throw new DomainException('PROJECTS_FORBIDDEN', 'Non autorisé.', 403);

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name        && { name:        dto.name }),
        ...(dto.description && { description: dto.description }),
        ...(dto.repoUrl     && { repoUrl:     dto.repoUrl }),
        ...(dto.demoUrl     && { demoUrl:     dto.demoUrl }),
      },
    });
  }

  // Même règle de slug que le forum (ForumService.createPost) : tags normalisés en slug.
  private async upsertTags(names: string[]) {
    return Promise.all(
      names.map(async (tagName) => {
        const slug = tagName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const tag = await this.prisma.tag.upsert({
          where:  { slug },
          update: { usageCount: { increment: 1 } },
          create: { name: tagName, slug, usageCount: 1 },
        });
        return { tagId: tag.id };
      }),
    );
  }

  async delete(projectId: string, userId: string, userRole: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    if (project.userId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new DomainException('PROJECTS_FORBIDDEN', 'Non autorisé.', 403);
    }

    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async star(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    const existing = await this.prisma.projectStar.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });

    if (existing) {
      // Toggle off
      await this.prisma.projectStar.delete({
        where: { userId_projectId: { userId, projectId } },
      });
      return { starred: false };
    }

    await this.prisma.projectStar.create({
      data: { userId, projectId },
    });
    return { starred: true };
  }

  async approve(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    return this.prisma.project.update({
      where: { id: projectId },
      data:  { isApproved: true },
    });
  }

  async reject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new DomainException('PROJECTS_PROJECT_NOT_FOUND', 'Projet introuvable.', 404);

    return this.prisma.project.update({
      where: { id: projectId },
      data:  { isApproved: false },
    });
  }

  async getPending() {
    return this.prisma.project.findMany({
      where:   { isApproved: false },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
