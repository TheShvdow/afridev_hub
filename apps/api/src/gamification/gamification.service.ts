import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { GamificationReputationUpdatedEvent } from '@afridev/shared-types';
import { isVerifiedProfile, VERIFIED_BADGE_SLUG } from './verified-badge';

interface ReputationEvent {
  userId:    string;
  delta:     number;
  reason:    string;
  entityId?: string;
}

@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

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

    // Temps réel : la passerelle notifications relaie le nouveau score au client.
    const payload: GamificationReputationUpdatedEvent = {
      userId:     event.userId,
      reputation: user.reputation,
      delta:      event.delta,
      reason:     event.reason,
    };
    this.events.emit('gamification.reputation.updated', payload);

    return user;
  }

  // API publique exportée (story E2-5) : seul point d'écriture de la réputation.
  async addPoints(userId: string, delta: number, reason: string, entityId?: string) {
    return this.addReputation({ userId, delta, reason, entityId });
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

  // Attribue ou retire le badge « dev vérifié » selon l'état actuel du profil.
  async syncVerifiedBadge(userId: string) {
    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: { isVerified: true, country: true, stack: true, bio: true, githubUsername: true, linkedinUsername: true, twitterUsername: true, websiteUrl: true },
    });
    if (!user) return;

    const badge = await this.prisma.badge.findUnique({ where: { slug: VERIFIED_BADGE_SLUG } });
    if (!badge) {
      this.logger.warn(`Badge ${VERIFIED_BADGE_SLUG} absent : lancer le seed`);
      return;
    }

    const key = { userId_badgeId: { userId, badgeId: badge.id } };
    const earned = await this.prisma.userBadge.findUnique({ where: key });
    const qualifies = isVerifiedProfile(user);

    if (qualifies && !earned) {
      await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id } });
      this.logger.log(`Badge ${VERIFIED_BADGE_SLUG} attribué à userId=${userId}`);
    } else if (!qualifies && earned) {
      await this.prisma.userBadge.delete({ where: key });
      this.logger.log(`Badge ${VERIFIED_BADGE_SLUG} retiré à userId=${userId}`);
    }
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
