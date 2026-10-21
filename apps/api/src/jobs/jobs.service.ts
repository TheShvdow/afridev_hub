import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobOffer, JobStatus, Prisma } from '@prisma/client';
import type {
  JobsApplicationCreatedEvent,
  JobsOfferPublishedEvent,
  JobsOfferReviewedEvent,
} from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CurrencyService, RatesSnapshot } from '../currency/currency.service';
import { UploadService } from '../upload/upload.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { ListJobsDto } from './dto/list-jobs.dto';
import { ApplyJobDto } from './dto/apply-job.dto';
import { DomainException } from '../common/errors/domain.exception';
import { getRecruiterPlan } from './recruiter-plan';

export const JOB_LIFETIME_DAYS = 60; // glossaire « Offre » : expiration à J60
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DISPLAY_CURRENCY = 'XOF';
const MODERATOR_ROLES = ['ADMIN', 'MODERATOR'];

export interface JobsViewer {
  id:   string;
  role: string;
}

const RECRUITER_SELECT = { id: true, username: true, displayName: true, avatarUrl: true, companyName: true } as const;

const LIST_SELECT = {
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
  publishedAt: true,
  expiresAt:   true,
  createdAt:   true,
  recruiter:   { select: RECRUITER_SELECT },
} satisfies Prisma.JobOfferSelect;

// Profil candidat : tronqué pour le plan gratuit, complet pour le premium (FR-34).
const APPLICANT_SUMMARY = { id: true, username: true, displayName: true, avatarUrl: true } as const;
const APPLICANT_FULL = {
  ...APPLICANT_SUMMARY,
  email:           true,
  bio:             true,
  location:        true,
  country:         true,
  stack:           true,
  level:           true,
  reputation:      true,
  isVerified:      true,
  githubUsername:  true,
  linkedinUsername:true,
  websiteUrl:      true,
} as const;

const normalizeStack = (stack: string[]) => [...new Set(stack.map((item) => item.trim().toLowerCase()).filter(Boolean))];

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly currency: CurrencyService,
    private readonly uploads: UploadService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Lecture publique ─────────────────────────────────────────────────

  async list(dto: ListJobsDto, viewer?: JobsViewer | null) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [rates, displayCurrency] = await Promise.all([
      this.currency.getRates(),
      this.displayCurrency(dto.currency, viewer),
    ]);

    // Seules les offres validées et non expirées sont visibles (FR-28, FR-33).
    const where: Prisma.JobOfferWhereInput = { status: 'ACTIVE', expiresAt: { gt: new Date() } };
    const and: Prisma.JobOfferWhereInput[] = [];

    if (dto.type)    where.type = dto.type;
    if (dto.mode)    where.mode = dto.mode;
    if (dto.country) where.country = dto.country;
    if (dto.stack?.length) where.stack = { hasSome: dto.stack };

    if (dto.salaryMin) {
      // Filtre entre devises sur le salaire converti en USD ; sans taux, même devise uniquement.
      const minUsd = this.currency.toUsd(dto.salaryMin, displayCurrency, rates);
      and.push(minUsd !== null
        ? { salaryMaxUsd: { gte: minUsd } }
        : { currency: displayCurrency, salaryMax: { gte: dto.salaryMin } });
    }
    if (dto.search) {
      and.push({ OR: [
        { title:       { contains: dto.search, mode: 'insensitive' } },
        { description: { contains: dto.search, mode: 'insensitive' } },
        { company:     { contains: dto.search, mode: 'insensitive' } },
      ] });
    }
    if (and.length) where.AND = and;

    const [jobs, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take:    limit,
        select:  LIST_SELECT,
      }),
      this.prisma.jobOffer.count({ where }),
    ]);

    return {
      data: jobs.map((job) => ({ ...job, converted: this.converted(job, displayCurrency, rates) })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), currency: displayCurrency },
    };
  }

  // Une offre non publiée n'est visible que de son auteur et de la modération.
  async findOne(id: string, viewer?: JobsViewer | null, currency?: string) {
    const job = await this.prisma.jobOffer.findUnique({
      where:   { id },
      include: { recruiter: { select: RECRUITER_SELECT } },
    });
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);

    const canSeeAll = !!viewer && (viewer.id === job.recruiterId || MODERATOR_ROLES.includes(viewer.role));
    const isPublic = job.status === 'ACTIVE' && job.expiresAt > new Date();
    if (!isPublic && !canSeeAll) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);

    const [rates, displayCurrency] = await Promise.all([
      this.currency.getRates(),
      this.displayCurrency(currency, viewer),
    ]);
    return { ...job, converted: this.converted(job, displayCurrency, rates) };
  }

  // ── Recruteur ────────────────────────────────────────────────────────

  async getPlan(userId: string) {
    return getRecruiterPlan(this.prisma, userId);
  }

  async listMine(userId: string) {
    return this.prisma.jobOffer.findMany({
      where:   { recruiterId: userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    });
  }

  async create(recruiterId: string, dto: CreateJobDto) {
    await this.requireRecruiter(recruiterId);

    if (dto.salaryMin > dto.salaryMax) {
      throw new DomainException('JOBS_SALARY_RANGE_INVALID', 'Le salaire minimum ne peut pas dépasser le maximum.', 400);
    }

    // FR-34 : au-delà du quota gratuit, le recruteur doit passer premium.
    const plan = await getRecruiterPlan(this.prisma, recruiterId);
    if (plan.monthlyLimit !== null && plan.offersThisMonth >= plan.monthlyLimit) {
      throw new DomainException(
        'JOBS_PLAN_LIMIT_REACHED',
        `Le plan gratuit permet ${plan.monthlyLimit} offres par mois. Passez au plan premium pour en publier davantage.`,
        402,
      );
    }

    const usd = this.salaryUsd(dto.salaryMin, dto.salaryMax, dto.currency, await this.currency.getRates());

    // FR-28 : toute offre attend la validation de la modération avant d'être visible.
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
        ...usd,
        stack:       normalizeStack(dto.stack),
        status:      'PENDING_REVIEW',
        expiresAt:   this.newExpiry(),
      },
      include: { recruiter: { select: RECRUITER_SELECT } },
    });
  }

  async update(jobId: string, userId: string, dto: UpdateJobDto) {
    const job = await this.requireOwnJob(jobId, userId);

    // Contrôle sur les valeurs finales : une seule borne peut être modifiée.
    const salaryMin = dto.salaryMin ?? job.salaryMin;
    const salaryMax = dto.salaryMax ?? job.salaryMax;
    if (salaryMin > salaryMax) {
      throw new DomainException('JOBS_SALARY_RANGE_INVALID', 'Le salaire minimum ne peut pas dépasser le maximum.', 400);
    }
    const currency = dto.currency ?? job.currency;
    const salaryChanged = dto.salaryMin !== undefined || dto.salaryMax !== undefined || dto.currency !== undefined;

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data: {
        ...(dto.title       !== undefined && { title:       dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.company     !== undefined && { company:     dto.company }),
        ...(dto.country     !== undefined && { country:     dto.country }),
        ...(dto.type        !== undefined && { type:        dto.type }),
        ...(dto.mode        !== undefined && { mode:        dto.mode }),
        ...(dto.stack       !== undefined && { stack:       normalizeStack(dto.stack) }),
        ...(dto.currency    !== undefined && { currency:    dto.currency }),
        ...(dto.salaryMin   !== undefined && { salaryMin:   dto.salaryMin }),
        ...(dto.salaryMax   !== undefined && { salaryMax:   dto.salaryMax }),
        ...(salaryChanged && this.salaryUsd(salaryMin, salaryMax, currency, await this.currency.getRates())),
        // Une offre refusée puis corrigée repart en validation.
        ...(job.status === 'REJECTED' && { status: 'PENDING_REVIEW', rejectionReason: null }),
      },
    });
  }

  async close(jobId: string, userId: string) {
    await this.requireOwnJob(jobId, userId);
    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data:  { status: 'CLOSED' },
    });
  }

  // FR-33 : le recruteur prolonge une offre active ou expirée de 60 jours.
  async renew(jobId: string, userId: string) {
    const job = await this.requireOwnJob(jobId, userId);
    if (job.status !== 'ACTIVE' && job.status !== 'EXPIRED') {
      throw new DomainException('JOBS_OFFER_NOT_RENEWABLE', 'Seule une offre publiée ou expirée peut être renouvelée.', 409);
    }

    return this.prisma.jobOffer.update({
      where: { id: jobId },
      data:  { status: 'ACTIVE', expiresAt: this.newExpiry(), expiryReminderSentAt: null },
    });
  }

  // ── Candidatures ─────────────────────────────────────────────────────

  async apply(jobId: string, userId: string, dto: ApplyJobDto) {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.status !== 'ACTIVE' || job.expiresAt <= new Date()) {
      throw new DomainException('JOBS_OFFER_CLOSED', 'Cette offre n\'accepte plus de candidatures.', 403);
    }
    if (job.recruiterId === userId) {
      throw new DomainException('JOBS_FORBIDDEN', 'Vous ne pouvez pas postuler à votre propre offre.', 403);
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId, userId } },
    });
    if (existing) throw new DomainException('JOBS_ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre.', 409);

    const cvKey = dto.cvKey ? await this.uploads.confirmCv(userId, dto.cvKey) : undefined;

    let application;
    try {
      application = await this.prisma.jobApplication.create({
        data: { jobId, userId, message: dto.message, cvUrl: cvKey },
      });
    } catch (error) {
      // Deux envois simultanés : la contrainte unique tranche.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainException('JOBS_ALREADY_APPLIED', 'Vous avez déjà postulé à cette offre.', 409);
      }
      throw error;
    }

    const event: JobsApplicationCreatedEvent = {
      applicationId: application.id,
      jobId,
      jobTitle:      job.title,
      recruiterId:   job.recruiterId,
      applicantId:   userId,
    };
    this.events.emit('jobs.application.created', event);

    const { cvUrl: _key, ...rest } = application;
    return { ...rest, hasCv: !!cvKey };
  }

  async getApplications(jobId: string, userId: string) {
    await this.requireOwnJob(jobId, userId);
    const plan = await getRecruiterPlan(this.prisma, userId);

    const applications = await this.prisma.jobApplication.findMany({
      where:   { jobId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: plan.isPremium ? APPLICANT_FULL : APPLICANT_SUMMARY } },
    });

    return Promise.all(applications.map(async ({ cvUrl, ...application }) => ({
      ...application,
      profileTruncated: !plan.isPremium,
      cvDownloadUrl:    cvUrl ? await this.uploads.cvDownloadUrl(cvUrl) : null,
    })));
  }

  // ── Validation par la modération (FR-28) ─────────────────────────────

  async listPendingReview(page = 1, limit = 20) {
    const where: Prisma.JobOfferWhereInput = { status: 'PENDING_REVIEW' };
    const [jobs, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip:    (page - 1) * limit,
        take:    limit,
        include: { recruiter: { select: { ...RECRUITER_SELECT, email: true } } },
      }),
      this.prisma.jobOffer.count({ where }),
    ]);
    return { data: jobs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async approve(jobId: string, moderatorId: string) {
    const job = await this.requirePending(jobId);
    const now = new Date();

    const [updated] = await this.prisma.$transaction([
      this.prisma.jobOffer.update({
        where: { id: jobId },
        // La durée de vie de 60 jours part de la publication, pas de la soumission.
        data:  { status: 'ACTIVE', publishedAt: now, expiresAt: this.newExpiry(now), expiryReminderSentAt: null, rejectionReason: null },
      }),
      this.prisma.auditLog.create({
        data: { userId: moderatorId, action: 'JOB_APPROVED', entityType: 'JOB_OFFER', entityId: jobId },
      }),
    ]);

    this.emitReviewed(job, true);
    const published: JobsOfferPublishedEvent = { jobId, recruiterId: job.recruiterId };
    this.events.emit('jobs.offer.published', published);
    return updated;
  }

  async reject(jobId: string, moderatorId: string, reason: string) {
    const job = await this.requirePending(jobId);

    const [updated] = await this.prisma.$transaction([
      this.prisma.jobOffer.update({
        where: { id: jobId },
        data:  { status: 'REJECTED', rejectionReason: reason },
      }),
      this.prisma.auditLog.create({
        data: {
          userId: moderatorId, action: 'JOB_REJECTED', entityType: 'JOB_OFFER', entityId: jobId,
          metadata: { reason } as Prisma.InputJsonObject,
        },
      }),
    ]);

    this.emitReviewed(job, false, reason);
    return updated;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async requireRecruiter(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isRecruiter: true } });
    if (!user?.isRecruiter) {
      throw new DomainException(
        'JOBS_RECRUITER_REQUIRED',
        'Activez votre profil recruteur (POST /users/me/recruiter) pour publier une offre.',
        403,
      );
    }
  }

  private async requireOwnJob(jobId: string, userId: string): Promise<JobOffer> {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.recruiterId !== userId) throw new DomainException('JOBS_FORBIDDEN', 'Non autorisé.', 403);
    return job;
  }

  private async requirePending(jobId: string): Promise<JobOffer> {
    const job = await this.prisma.jobOffer.findUnique({ where: { id: jobId } });
    if (!job) throw new DomainException('JOBS_OFFER_NOT_FOUND', 'Offre introuvable.', 404);
    if (job.status !== JobStatus.PENDING_REVIEW) {
      throw new DomainException('JOBS_OFFER_NOT_PENDING', 'Cette offre n\'est pas en attente de validation.', 409);
    }
    return job;
  }

  private emitReviewed(job: JobOffer, approved: boolean, reason?: string) {
    const event: JobsOfferReviewedEvent = {
      jobId: job.id, recruiterId: job.recruiterId, title: job.title, approved, ...(reason && { reason }),
    };
    this.events.emit('jobs.offer.reviewed', event);
  }

  private newExpiry(from = new Date()) {
    return new Date(from.getTime() + JOB_LIFETIME_DAYS * DAY_MS);
  }

  private salaryUsd(salaryMin: number, salaryMax: number, currency: string, rates: RatesSnapshot) {
    return {
      salaryMinUsd: this.currency.toUsd(salaryMin, currency, rates),
      salaryMaxUsd: this.currency.toUsd(salaryMax, currency, rates),
    };
  }

  private async displayCurrency(requested: string | undefined, viewer?: JobsViewer | null): Promise<string> {
    if (requested) return requested;
    if (viewer) {
      const user = await this.prisma.user.findUnique({ where: { id: viewer.id }, select: { preferredCurrency: true } });
      if (user?.preferredCurrency) return user.preferredCurrency;
    }
    return DEFAULT_DISPLAY_CURRENCY;
  }

  // FR-30 : le salaire d'origine reste affiché ; la conversion s'ajoute quand la devise diffère.
  private converted(
    job: { salaryMin: number; salaryMax: number; currency: string },
    target: string,
    rates: RatesSnapshot,
  ) {
    if (job.currency === target) return null;
    const salaryMin = this.currency.convert(job.salaryMin, job.currency, target, rates);
    const salaryMax = this.currency.convert(job.salaryMax, job.currency, target, rates);
    if (salaryMin === null || salaryMax === null) return null;
    return { currency: target, salaryMin, salaryMax, ratesAt: rates.updatedAt };
  }
}
