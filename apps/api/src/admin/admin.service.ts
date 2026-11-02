import { Injectable } from '@nestjs/common';
import { ModerationActionType, ModerationTargetType, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/errors/domain.exception';

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
      projectsWithGithubStats,
      totalRevenue,
      forum,
      forumLast30Days,
      jobs,
      capturedPayments,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
      }),
      this.prisma.post.count(),                                         // Post has no `status` field
      this.prisma.project.count({ where: { isHidden: false } }),
      this.prisma.jobOffer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      // SM-6 : projets dont les stats GitHub ont été importées.
      this.prisma.project.count({ where: { isHidden: false, githubSyncedAt: { not: null } } }),
      this.prisma.commission.aggregate({                                // Commission is a separate model
        where: { payment: { status: 'CAPTURED' } },                    // CAPTURED not COMPLETED
        _sum:  { amount: true },
      }),
      this.forumStats(),
      this.forumStats(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      this.jobStats(),
      // SM-3 : paiements réussis de bout en bout (webhook ou réconciliation confirmés).
      this.prisma.payment.count({ where: { status: 'CAPTURED' } }),
    ]);

    return {
      users:        { total: totalUsers, newThisWeek: newUsersThisWeek },
      content:      { posts: totalPosts, projects: totalProjects, jobs: totalJobs },
      projects:     { visible: totalProjects, withGithubStats: projectsWithGithubStats },
      moderation:   { pendingReports },
      revenue:      { totalCommission: totalRevenue._sum.amount ?? 0, capturedPayments }, // _sum.amount not _sum.commission
      forum:        { ...forum, last30Days: forumLast30Days },
      jobs,
    };
  }

  // SM-5 : offres publiées (validées par la modération). Le salaire est obligatoire sur
  // chaque offre, toutes comptent donc comme « offres avec salaire ».
  private async jobStats() {
    const since = new Date(Date.now() - 60 * 24 * 3600 * 1000);
    const [published, publishedLast60Days, pendingReview] = await Promise.all([
      this.prisma.jobOffer.count({ where: { publishedAt: { not: null } } }),
      this.prisma.jobOffer.count({ where: { publishedAt: { gte: since } } }),
      this.prisma.jobOffer.count({ where: { status: 'PENDING_REVIEW' } }),
    ]);
    return { published, publishedLast60Days, pendingReview };
  }

  // SM-2 (questions avec au moins une réponse) et SM-7 (taux de réponses acceptées).
  // Les contenus masqués par la modération ne comptent pas.
  private async forumStats(since?: Date) {
    const where: Prisma.PostWhereInput = { isHidden: false, ...(since && { createdAt: { gte: since } }) };
    const [questions, questionsWithAnswer, questionsWithAcceptedAnswer] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.count({ where: { ...where, answers: { some: { isHidden: false } } } }),
      this.prisma.post.count({ where: { ...where, answers: { some: { isAccepted: true, isHidden: false } } } }),
    ]);
    return {
      questions,
      questionsWithAnswer,
      questionsWithAcceptedAnswer,
      acceptedAnswerRate: questions ? Math.round((questionsWithAcceptedAnswer / questions) * 100) : 0,
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

    const banned = await this.bannedUserIds(users.map((user) => user.id));

    return {
      data: users.map((user) => ({ ...user, isBanned: banned.has(user.id) })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // Même règle que `isUserBanned` : un compte est banni si sa dernière action BAN ou RESTORED est un BAN.
  // Une seule requête pour toute la page.
  private async bannedUserIds(userIds: string[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const actions = await this.prisma.moderationAction.findMany({
      where: {
        entityType: ModerationTargetType.USER,
        entityId:   { in: userIds },
        action:     { in: [ModerationActionType.BAN, ModerationActionType.RESTORED] },
      },
      orderBy: { createdAt: 'asc' },
      select:  { entityId: true, action: true },
    });

    const banned = new Set<string>();
    for (const { entityId, action } of actions) {
      if (action === ModerationActionType.BAN) banned.add(entityId);
      else banned.delete(entityId);
    }
    return banned;
  }

  // Chaque changement de rôle est journalisé : qui, quel compte, quel rôle.
  // Garde-fous : on ne change pas son propre rôle, et le dernier administrateur ne peut pas être rétrogradé
  // (le site se retrouverait sans personne pour gérer les rôles).
  async updateUserRole(userId: string, role: UserRole, actorId: string) {
    if (userId === actorId) {
      throw new DomainException('ADMIN_OWN_ROLE_CHANGE_FORBIDDEN', 'Vous ne pouvez pas modifier votre propre rôle.', 403);
    }

    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new DomainException('USERS_USER_NOT_FOUND', 'Utilisateur introuvable.', 404);

    if (target.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const admins = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (admins <= 1) {
        throw new DomainException('ADMIN_LAST_ADMIN', 'Impossible de rétrograder le dernier administrateur.', 409);
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data:  { role },
      select: { id: true, username: true, role: true },
    });
    await this.createAuditEntry(actorId, 'USER_ROLE_UPDATED', 'USER', userId, { role });
    return user;
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

  createAuditEntry(
    userId: string,
    action: string,
    entityType: string,               // was targetType
    entityId: string,                 // was targetId
    details?: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata: (details ?? {}) as Prisma.InputJsonObject }, // metadata not details
    });
  }
}
