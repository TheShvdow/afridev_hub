import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoteValue, VoteEntityType } from '@prisma/client';
import type { VotesVoteChangedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { DomainException } from '../common/errors/domain.exception';

type VotableType = 'POST' | 'ANSWER';

// Glossaire « Vote » : voter est réservé aux membres avec réputation ≥ 10.
const MIN_REPUTATION_TO_VOTE = 10;

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async vote(
    userId: string,
    entityType: VotableType,
    entityId: string,
    rawValue: 1 | -1,
  ) {
    const voter = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: { reputation: true },
    });
    if (!voter) throw new DomainException('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable.', 401);
    if (voter.reputation < MIN_REPUTATION_TO_VOTE) {
      throw new DomainException(
        'VOTES_REPUTATION_TOO_LOW',
        `Il faut au moins ${MIN_REPUTATION_TO_VOTE} points de réputation pour voter.`,
        403,
      );
    }

    const targetOwnerId = await this.getOwnerId(entityType, entityId);
    if (!targetOwnerId) throw new DomainException('VOTES_TARGET_NOT_FOUND', 'Cible introuvable.', 404);

    if (targetOwnerId === userId) {
      throw new DomainException(
        'VOTES_SELF_VOTE_FORBIDDEN',
        'Vous ne pouvez pas voter pour votre propre contenu.',
        403,
      );
    }

    const next: VoteValue = rawValue === 1 ? VoteValue.UP : VoteValue.DOWN;
    const prismaEntityType = entityType as VoteEntityType;
    const uniqueKey = { userId_entityType_entityId: { userId, entityType: prismaEntityType, entityId } };

    const existing = await this.prisma.vote.findUnique({ where: uniqueKey });

    let action: 'added' | 'changed' | 'removed';
    let previous: VoteValue | null;
    let nextValue: VoteValue | null;

    if (existing && existing.value === next) {
      // Toggle off : même vote renvoyé → annulation
      await this.prisma.vote.delete({ where: uniqueKey });
      action = 'removed';
      previous = existing.value;
      nextValue = null;
    } else if (existing) {
      await this.prisma.vote.update({ where: uniqueKey, data: { value: next } });
      action = 'changed';
      previous = existing.value;
      nextValue = next;
    } else {
      await this.prisma.vote.create({
        data: { userId, entityType: prismaEntityType, entityId, value: next },
      });
      action = 'added';
      previous = null;
      nextValue = next;
    }

    // La réputation n'est pas écrite ici : GamificationModule réagit à l'événement (spine AD-2).
    const payload: VotesVoteChangedEvent = {
      targetOwnerId,
      entityType: prismaEntityType,
      entityId,
      previous,
      next: nextValue,
    };
    this.events.emit('votes.vote.changed', payload);

    return { action, newScore: await this.getScore(entityType, entityId) };
  }

  private async getOwnerId(
    entityType: VotableType,
    entityId: string,
  ): Promise<string | null> {
    if (entityType === 'POST') {
      const post = await this.prisma.post.findUnique({
        where:  { id: entityId },
        select: { userId: true },
      });
      return post?.userId ?? null;
    }
    const answer = await this.prisma.answer.findUnique({
      where:  { id: entityId },
      select: { userId: true },
    });
    return answer?.userId ?? null;
  }

  private async getScore(
    entityType: VotableType,
    entityId: string,
  ): Promise<number> {
    const prismaEntityType = entityType as VoteEntityType;
    const [upCount, downCount] = await Promise.all([
      this.prisma.vote.count({
        where: { entityType: prismaEntityType, entityId, value: VoteValue.UP },
      }),
      this.prisma.vote.count({
        where: { entityType: prismaEntityType, entityId, value: VoteValue.DOWN },
      }),
    ]);
    return upCount - downCount;
  }
}
