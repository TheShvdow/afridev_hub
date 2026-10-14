import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      newUsersThisWeek,
      totalPosts,
      totalProjects,
      totalJobs,
      pendingReports,
      pendingProjects,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
      this.prisma.post.count(),                                         // Post has no `status` field
      this.prisma.project.count({ where: { isApproved: true } }),       // isApproved not status
      this.prisma.jobOffer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.project.count({ where: { isApproved: false } }),      // pending = not yet approved
      this.prisma.commission.aggregate({                                // Commission is a separate model
        where: { payment: { status: 'CAPTURED' } },                    // CAPTURED not COMPLETED
        _sum:  { amount: true },
      }),
    ]);

    return {
      users:        { total: totalUsers, newThisWeek: newUsersThisWeek },
      content:      { posts: totalPosts, projects: totalProjects, jobs: totalJobs },
      moderation:   { pendingReports, pendingProjects },
      revenue:      { totalCommission: totalRevenue._sum.amount ?? 0 }, // _sum.amount not _sum.commission
    };
  }

  async listUsers(page = 1, limit = 30, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email:    { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        select: {
          id:         true,
          username:   true,
          email:      true,
          role:       true,
          isVerified: true,
          // isBanned removed — User has no such field; ban state lives in ModerationAction
          reputation: true,
          createdAt:  true,
          lastSeenAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateUserRole(userId: string, role: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data:  { role: role as never },
      select: { id: true, username: true, role: true },
    });
  }

  async getAuditLog(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return { data: logs, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async createAuditEntry(
    userId: string,
    action: string,
    entityType: string,               // was targetType
    entityId: string,                 // was targetId
    details?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata: details ?? {} }, // metadata not details
    });
  }
}
