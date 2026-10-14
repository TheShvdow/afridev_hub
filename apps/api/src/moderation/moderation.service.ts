import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportEntityType, ReportStatus, ModerationActionType } from '@prisma/client'; // ReportType n'existe pas

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    userId: string,                     // was reporterId — field on Report is `userId`
    entityType: string,                 // Report has entityType (ReportEntityType), not targetType
    entityId: string,                   // Report has entityId, not targetId
    reason: string,                     // reason is a plain String on Report, not an enum
  ) {
    return this.prisma.report.create({
      data: {
        userId,
        entityType: entityType as ReportEntityType,
        entityId,
        reason,                         // no `description` field on Report
      },
    });
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

  async resolveReport(
    reportId: string,
    moderatorId: string,
    action: ModerationActionType,
    note?: string,
  ) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    // Report has no resolvedBy/resolvedAt/resolution/moderatorNote fields — must use ModerationAction
    await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data:  { status: 'RESOLVED' },
      }),
      this.prisma.moderationAction.create({
        data: {
          moderatorId,
          reportId,
          entityType: report.entityType,   // String (stored as enum value)
          entityId:   report.entityId,
          action,
          note,
        },
      }),
    ]);

    return { success: true, reportId };
  }

  async dismissReport(reportId: string, moderatorId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    await this.prisma.$transaction([
      this.prisma.report.update({
        where: { id: reportId },
        data:  { status: 'DISMISSED' },
      }),
      this.prisma.moderationAction.create({
        data: {
          moderatorId,
          reportId,
          entityType: report.entityType,
          entityId:   report.entityId,
          action:     ModerationActionType.HIDDEN,
        },
      }),
    ]);

    return { success: true, reportId };
  }

  async banUser(userId: string, moderatorId: string, reason: string) {
    // User has NO isBanned/bannedAt/bannedUntil/banReason fields — ban via ModerationAction
    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        entityType: 'USER',
        entityId:   userId,
        action:     ModerationActionType.BAN,
        note:       reason,
      },
    });
  }

  async unbanUser(userId: string, moderatorId: string) {
    // Restore access — RESTORED is the closest action to "unban"
    return this.prisma.moderationAction.create({
      data: {
        moderatorId,
        entityType: 'USER',
        entityId:   userId,
        action:     ModerationActionType.RESTORED,
        note:       'Accès restauré (levée de ban)',
      },
    });
  }
}
