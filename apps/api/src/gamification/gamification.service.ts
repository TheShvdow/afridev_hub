import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReputationEvent {
  userId:    string;
  delta:     number;
  reason:    string;
  entityId?: string;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Réputation ───────────────────────────────────────────────────────

  async addReputation(event: ReputationEvent) {
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: event.userId },
        data: { reputation: { increment: event.delta } },
        select: { id: true, reputation: true },
      }),
      this.prisma.reputationEvent.create({
        data: {
          userId:   event.userId,
          delta:    event.delta,
          reason:   event.reason,
          entityId: event.entityId,
        },
      }),
    ]);

    // Vérifier les seuils de badges
    await this.checkBadgeMilestones(event.userId, user.reputation);

    return user;
  }

  async getLeaderboard(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    return this.prisma.user.findMany({
      orderBy: { reputation: 'desc' },
      skip,
      take:    limit,
      select: {
        id:          true,
        username:    true,
        displayName: true,
        avatarUrl:   true,
        reputation:  true,
        location:    true,
        _count: {
          select: { posts: true, answers: true, receivedBadges: true },
        },
      },
    });
  }

  async getUserReputation(userId: string) {
    const [user, events] = await Promise.all([
      this.prisma.user.findUnique({
        where:  { id: userId },
        select: { reputation: true },
      }),
      this.prisma.reputationEvent.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        take:    20,
      }),
    ]);

    return { reputation: user?.reputation ?? 0, history: events };
  }

  // ── Badges ───────────────────────────────────────────────────────────

  async awardBadge(userId: string, badgeSlug: string) {
    const badge = await this.prisma.badge.findUnique({ where: { slug: badgeSlug } });
    if (!badge) {
      this.logger.warn(`Badge inconnu: ${badgeSlug}`);
      return null;
    }

    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });

    if (existing) return null; // Déjà obtenu

    const userBadge = await this.prisma.userBadge.create({
      data: { userId, badgeId: badge.id },
      include: { badge: true },
    });

    this.logger.log(`Badge ${badgeSlug} attribué à userId=${userId}`);
    return userBadge;
  }

  async listBadges() {
    return this.prisma.badge.findMany({
      orderBy: [{ category: 'asc' }, { requiredPoints: 'asc' }],
    });
  }

  // ── Privé ────────────────────────────────────────────────────────────

  private async checkBadgeMilestones(userId: string, currentRep: number) {
    const milestones: Array<{ threshold: number; slug: string }> = [
      { threshold:    10, slug: 'newcomer'     },
      { threshold:    50, slug: 'contributor'  },
      { threshold:   100, slug: 'established'  },
      { threshold:   500, slug: 'trusted'      },
      { threshold:  1000, slug: 'expert'       },
      { threshold:  5000, slug: 'master'       },
      { threshold: 10000, slug: 'guru'         },
    ];

    for (const m of milestones) {
      if (currentRep >= m.threshold) {
        await this.awardBadge(userId, m.slug).catch(() => null);
      }
    }
  }
}
