import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JobMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    page      = 1,
    limit     = 20,
    type?:    string,      // kept for controller compat but unused (no type field in schema)
    workMode?: string,
    search?:   string,
  ) {
    const skip = (page - 1) * limit;
    const where: Parameters<typeof this.prisma.jobOffer.findMany>[0]['where'] = {
      status: 'ACTIVE',
    };

    // Note: `type` has no equivalent field in the schema — ignored intentionally

    if (workMode) {
      where.mode = workMode as JobMode;
    }

    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { company:     { contains: search, mode: 'insensitive' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        select: {
          id:          true,
          title:       true,
          company:     true,
          country:     true,
          mode:        true,
          stack:       true,
          status:      true,
          salaryMin:   true,
          salaryMax:   true,
          currency:    true,
          expiresAt:   true,
          createdAt:   true,
          recruiter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.jobOffer.count({ where }),
    ]);

    return {
      data: jobs,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.jobOffer.findUnique({
      where: { id },
      include: {
        recruiter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    if (!job) throw new NotFoundException('Offre introuvable.');
    if (job.status === 'CLOSED' || job.status === 'EXPIRED') {
      throw new NotFoundException('Offre introuvable.');
    }

    return job;
  }

  async create(recruiterId: string, dto: CreateJobDto) {
    return this.prisma.jobOffer.create({
      data: {
        title:       dto.title,
        description: dto.description,
        company:     dto.company,
        recruiterId,
        country:     dto.location   ?? '',
        mode:        dto.workMode   as JobMode,
        currency:    dto.currency   ?? 'XOF',
        salaryMin:   dto.salaryMin  ?? 0,
        salaryMax:   dto.salaryMax  ?? 0,
        stack:       dto.techStack  ?? [],
        status:      'ACTIVE',
        expiresAt:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        // Omitted: type (no such field), slug (no such field), publishedAt (no such field)
      },
      include: {
        recruiter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  async update(jobId: string, userId: string, dto: Partial<CreateJobDto>) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Offre introuvable.');
    if (job.recruiterId !== userId) throw new ForbiddenException('Non autorisé.');

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data: {
        ...(dto.title       && { title:       dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.location    && { country:     dto.location }),
        ...(dto.workMode    && { mode:        dto.workMode as JobMode }),
        ...(dto.techStack   && { stack:       dto.techStack }),
      },
    });
  }

  async close(jobId: string, userId: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Offre introuvable.');
    if (job.recruiterId !== userId) throw new ForbiddenException('Non autorisé.');

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data:  { status: 'CLOSED' },
    });
  }

  async apply(jobId: string, userId: string, message: string, cvUrl?: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Offre introuvable.');
    if (job.status !== 'ACTIVE') throw new ForbiddenException('Cette offre est fermée.');

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) throw new ConflictException('Vous avez déjà postulé à cette offre.');

    return this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        message,
        cvUrl,
      },
    });
  }

  async getApplications(jobId: string, userId: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Offre introuvable.');
    if (job.recruiterId !== userId) throw new ForbiddenException('Non autorisé.');

    return this.prisma.jobApplication.findMany({
      where:   { jobId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
