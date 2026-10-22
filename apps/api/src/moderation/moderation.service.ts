import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/errors/domain.exception';
import { Prisma, ReportEntityType, ReportStatus, ModerationActionType, ModerationTargetType } from '@prisma/client';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportResolution } from './dto/resolve-report.dto';

const DEFAULT_AUTO_HIDE_THRESHOLD = 3;

// Un signalement est ouvert tant qu'aucune décision n'a été prise.
const OPEN_STATUSES: ReportStatus[] = [ReportStatus.PENDING, ReportStatus.REVIEWED];

@Injectable()
export class ModerationService {
  private readonly autoHideThreshold: number;

  constructor(
    private readonly prisma: PrismaService,
    config?: ConfigService,
  ) {
    this.autoHideThreshold =
      config?.get<number>('MODERATION_AUTO_HIDE_THRESHOLD') ?? DEFAULT_AUTO_HIDE_THRESHOLD;
  }

  // FR-20 : un membre signale un contenu une seule fois. Au seuil de signalements
  // ouverts, le contenu est masqué en attendant la décision d'un modérateur.
  async createReport(userId: string, dto: CreateReportDto) {
    const target = await this.findTarget(dto.entityType, dto.entityId);
    if (!target) throw new DomainException('MODERATION_TARGET_NOT_FOUND', 'Contenu introuvable.', 404);

    let report;
    try {
      report = await this.prisma.report.create({
        data: {
          userId,
          entityType: dto.entityType,
          entityId:   dto.entityId,
          reason:     dto.details ? `${dto.reason} : ${dto.details}` : dto.reason,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DomainException('MODERATION_REPORT_DUPLICATE', 'Vous avez déjà signalé ce contenu.', 409);
      }
      throw error;
    }

    if (!target.isHidden) {
      const openReports = await this.prisma.report.count({
        where: { entityType: dto.entityType, entityId: dto.entityId, status: { in: OPEN_STATUSES } },
      });
      if (openReports >= this.autoHideThreshold) {
        await this.prisma.$transaction([
          this.setVisibility(dto.entityType, dto.entityId, true),
          this.prisma.moderationAction.create({
            data: {
              moderatorId: null,
              reportId:    report.id,
              entityType:  dto.entityType,
              entityId:    dto.entityId,
              action:      ModerationActionType.HIDDEN,
              note:        `Masquage automatique : ${openReports} signalements`,
            },
          }),
          this.audit(null, 'CONTENT_AUTO_HIDDEN', dto.entityType, dto.entityId, { reports: openReports }),
        ]);
      }
    }

    return report;
  }

  async listReports(status: ReportStatus = 'PENDING', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where:   { status },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          user: {                        // relation name is `user`, not `reporter`
            select: { id: true, username: true, avatarUrl: true },
          },
          moderationActions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.report.count({ where: { status } }),
    ]);

    return { data: reports, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // FR-21 : la décision s'applique au contenu et clôt tous ses signalements ouverts.
  async resolveReport(
    reportId: string,
    moderatorId: string,
    action: ReportResolution,
    note?: string,
  ) {
    const report = await this.findOpenReport(reportId);

    const operations: Prisma.PrismaPromise<unknown>[] = [];
    if (action === ModerationActionType.HIDDEN || action === ModerationActionType.RESTORED) {
      operations.push(this.setVisibility(report.entityType, report.entityId, action === ModerationActionType.HIDDEN));
    }

    await this.prisma.$transaction([
      ...operations,
      this.closeOpenReports(report.entityType, report.entityId, ReportStatus.RESOLVED),
      this.prisma.moderationAction.create({
        data: {
          moderatorId,
          reportId,
          entityType: report.entityType,
          entityId:   report.entityId,
          action,
          note,
        },
      }),
      this.audit(moderatorId, `REPORT_RESOLVED_${action}`, report.entityType, report.entityId, { reportId, note }),
    ]);

    return { success: true, reportId };
  }

  // Le signalement est jugé infondé : ses signalements ouverts sont abandonnés
  // et un contenu masqué automatiquement redevient visible.
  async dismissReport(reportId: string, moderatorId: string, note?: string) {
    const report = await this.findOpenReport(reportId);

    await this.prisma.$transaction([
      this.setVisibility(report.entityType, report.entityId, false),
      this.closeOpenReports(report.entityType, report.entityId, ReportStatus.DISMISSED),
      this.prisma.moderationAction.create({
        data: {
          moderatorId,
          reportId,
          entityType: report.entityType,
          entityId:   report.entityId,
          action:     ModerationActionType.DISMISSED,
          note,
        },
      }),
      this.audit(moderatorId, 'REPORT_DISMISSED', report.entityType, report.entityId, { reportId, note }),
    ]);

    return { success: true, reportId };
  }

  // Restaure un contenu masqué, avec ou sans signalement ouvert.
  async restoreContent(entityType: ReportEntityType, entityId: string, moderatorId: string, note?: string) {
    const target = await this.findTarget(entityType, entityId);
    if (!target) throw new DomainException('MODERATION_TARGET_NOT_FOUND', 'Contenu introuvable.', 404);

    await this.prisma.$transaction([
      this.setVisibility(entityType, entityId, false),
      this.prisma.moderationAction.create({
        data: { moderatorId, entityType, entityId, action: ModerationActionType.RESTORED, note },
      }),
      this.audit(moderatorId, 'CONTENT_RESTORED', entityType, entityId, { note }),
    ]);

    return { success: true };
  }

  // User has NO isBanned/bannedAt/bannedUntil/banReason fields — ban via ModerationAction.
  // L'action de modération et sa trace d'audit sont écrites ensemble ou pas du tout.
  async banUser(userId: string, moderatorId: string, reason: string) {
    const [action] = await this.prisma.$transaction([
      this.prisma.moderationAction.create({
        data: {
          moderatorId,
          entityType: ModerationTargetType.USER,
          entityId:   userId,
          action:     ModerationActionType.BAN,
          note:       reason,
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId:     moderatorId,
          action:     'USER_BANNED',
          entityType: 'USER',
          entityId:   userId,
          metadata:   { reason } as Prisma.InputJsonObject,
        },
      }),
    ]);
    return action;
  }

  async unbanUser(userId: string, moderatorId: string) {
    // Restore access — RESTORED is the closest action to "unban"
    const [action] = await this.prisma.$transaction([
      this.prisma.moderationAction.create({
        data: {
          moderatorId,
          entityType: ModerationTargetType.USER,
          entityId:   userId,
          action:     ModerationActionType.RESTORED,
          note:       'Accès restauré (levée de ban)',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          userId:     moderatorId,
          action:     'USER_UNBANNED',
          entityType: 'USER',
          entityId:   userId,
        },
      }),
    ]);
    return action;
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private async findOpenReport(reportId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new DomainException('MODERATION_REPORT_NOT_FOUND', 'Signalement introuvable.', 404);
    if (!OPEN_STATUSES.includes(report.status)) {
      throw new DomainException('MODERATION_REPORT_ALREADY_CLOSED', 'Ce signalement a déjà été traité.', 409);
    }
    return report;
  }

  private findTarget(entityType: ReportEntityType, entityId: string): Promise<{ isHidden: boolean } | null> {
    const args = { where: { id: entityId }, select: { isHidden: true } };
    switch (entityType) {
      case ReportEntityType.POST:    return this.prisma.post.findUnique(args);
      case ReportEntityType.ANSWER:  return this.prisma.answer.findUnique(args);
      case ReportEntityType.PROJECT: return this.prisma.project.findUnique(args);
    }
  }

  // updateMany : ne lève pas d'erreur si le contenu a été supprimé entre-temps.
  private setVisibility(entityType: ReportEntityType, entityId: string, hidden: boolean) {
    const args = {
      where: { id: entityId },
      data:  { isHidden: hidden, hiddenAt: hidden ? new Date() : null },
    };
    switch (entityType) {
      case ReportEntityType.POST:    return this.prisma.post.updateMany(args);
      case ReportEntityType.ANSWER:  return this.prisma.answer.updateMany(args);
      case ReportEntityType.PROJECT: return this.prisma.project.updateMany(args);
    }
  }

  private closeOpenReports(entityType: ReportEntityType, entityId: string, status: ReportStatus) {
    return this.prisma.report.updateMany({
      where: { entityType, entityId, status: { in: OPEN_STATUSES } },
      data:  { status },
    });
  }

  // FR-21 : journal d'audit pour chaque action de modération. userId null : action automatique.
  private audit(
    userId: string | null,
    action: string,
    entityType: ReportEntityType,
    entityId: string,
    metadata: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata: metadata as Prisma.InputJsonObject },
    });
  }
}
