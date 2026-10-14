import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportType } from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async createReport(
    reporterId: string,
    targetType: string,
    targetId: string,
    reason: string,
    description?: string,
  ) {
    return this.prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetId,
        reason:      reason as ReportType,
        description: description ?? '',
      },
    });
  }

  async listReports(status = 'PENDING', page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [reports, total] = await Promise.all([
      this.prisma.report.findMany({
        where:   { status: status as never },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          reporter: {
            select: { id: true, username: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.report.count({ where: { status: status as never } }),
    ]);

    return { data: reports, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async resolveReport(reportId: string, moderatorId: string, action: string, note?: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Signalement introuvable.');

    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status:       'RESOLVED',
        resolvedBy:   moderatorId,
        resolvedAt:   new Date(),
        resolution:   action,
        moderatorNote: note,
      },
    });
  }

  async dismissReport(reportId: string, moderatorId: string) {
    return this.resolveReport(reportId, moderatorId, 'DISMISSED');
  }

  async banUser(userId: string, moderatorId: string, reason: string, until?: Date) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isBanned:    true,
        bannedAt:    new Date(),
        bannedUntil: until ?? null,
        banReason:   reason,
      },
    });
  }

  async unbanUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isBanned: false, bannedAt: null, bannedUntil: null, banReason: null },
    });
  }
}
