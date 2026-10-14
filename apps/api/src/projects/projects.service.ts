import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: Parameters<typeof this.prisma.project.findMany>[0]['where'] = {
      isApproved: true,
    };

    if (search) {
      where.OR = [
        { name:        { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
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

    if (!project) throw new NotFoundException('Projet introuvable.');
    if (!project.isApproved) throw new NotFoundException('Projet introuvable.');

    return project;
  }

  async create(userId: string, dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name:        dto.title,      // DTO uses "title", DB uses "name"
        description: dto.description,
        repoUrl:     dto.repoUrl,
        demoUrl:     dto.demoUrl,
        userId,
        isApproved:  false,          // Requires admin approval
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async update(projectId: string, userId: string, dto: Partial<CreateProjectDto>) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable.');
    if (project.userId !== userId) throw new ForbiddenException('Non autorisé.');

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.title       && { name:        dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.repoUrl     && { repoUrl:     dto.repoUrl }),
        ...(dto.demoUrl     && { demoUrl:     dto.demoUrl }),
      },
    });
  }

  async delete(projectId: string, userId: string, userRole: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable.');

    if (project.userId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('Non autorisé.');
    }

    await this.prisma.project.delete({ where: { id: projectId } });
  }

  async star(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable.');

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
    if (!project) throw new NotFoundException('Projet introuvable.');

    return this.prisma.project.update({
      where: { id: projectId },
      data:  { isApproved: true },
    });
  }

  async reject(projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projet introuvable.');

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
