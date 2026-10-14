import {
  Injectable,
  } from '@nestjs/common';
import { JobMode, JobType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { DomainException } from '../common/errors/domain.exception';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    page   = 1,
    limit  = 20,
    type?:  JobType,
    mode?:  JobMode,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.JobOfferWhereInput = {
      status: 'ACTIVE',
    };

    if (type) {
      where.type = type;
    }
    if (mode) {
      where.mode = mode;
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
          type:        true,
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

    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.status === 'CLOSED' || job.status === 'EXPIRED') {
      throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    }

    return job;
  }

  async create(recruiterId: string, dto: CreateJobDto) {
    if (dto.salaryMin > dto.salaryMax) {
      throw new DomainException('JOBS_SALARY_RANGE_INVALID', 'Le salaire minimum ne peut pas dépasser le maximum.', 400);
    }

    return this.prisma.jobOffer.create({
      data: {
        title:       dto.title,
        description: dto.description,
        company:     dto.company,
        recruiterId,
        country:     dto.country,
        type:        dto.type,
        mode:        dto.mode,
        currency:    dto.currency,
        salaryMin:   dto.salaryMin,
        salaryMax:   dto.salaryMax,
        stack:       dto.stack,
        status:      'ACTIVE',
        expiresAt:   new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Expiration J60 (glossaire)
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
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.recruiterId !== userId) throw new DomainException('JOBS_FORBIDDEN', 'Non autorisé.', 403);

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data: {
        ...(dto.title       && { title:       dto.title }),
        ...(dto.description && { description: dto.description }),
        ...(dto.country     && { country:     dto.country }),
        ...(dto.type        && { type:        dto.type }),
        ...(dto.mode        && { mode:        dto.mode }),
        ...(dto.stack       && { stack:       dto.stack }),
      },
    });
  }

  async close(jobId: string, userId: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.recruiterId !== userId) throw new DomainException('JOBS_FORBIDDEN', 'Non autorisé.', 403);

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data:  { status: 'CLOSED' },
    });
  }

  async apply(jobId: string, userId: string, message: string, cvUrl?: string) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.status !== 'ACTIVE') throw new DomainException('JOBS_OFFER_CLOSED', 'Cette offre est fermée.', 403);

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) throw new DomainException('JOBS_ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre.', 409);

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
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.recruiterId !== userId) throw new DomainException('JOBS_FORBIDDEN', 'Non autorisé.', 403);

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
