import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { VoteValue, VoteEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type VotableType = 'POST' | 'ANSWER';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  async vote(
    userId: string,
    entityType: VotableType,
    entityId: string,
    rawValue: 1 | -1,
  ) {
    const ownerId = await this.getOwnerId(entityType, entityId);
    if (!ownerId) throw new NotFoundException('Cible introuvable.');

    if (ownerId === userId) {
      throw new ForbiddenException(
        'Vous ne pouvez pas voter pour votre propre contenu.',
      );
    }

    const value: VoteValue = rawValue === 1 ? VoteValue.UP : VoteValue.DOWN;
    const prismaEntityType = entityType as VoteEntityType;

    const existing = await this.prisma.vote.findUnique({
      where: {
        userId_entityType_entityId: { userId, entityType: prismaEntityType, entityId },
      },
    });

    if (existing) {
      if (existing.value === value) {
        // Toggle off — annuler le vote
        await this.prisma.vote.delete({
          where: {
            userId_entityType_entityId: { userId, entityType: prismaEntityType, entityId },
          },
        });
        await this.updateReputation(ownerId, rawValue === 1, false);
        return { action: 'removed', newScore: await this.getScore(entityType, entityId) };
      } else {
        // Changer de direction
        await this.prisma.vote.update({
          where: {
            userId_entityType_entityId: { userId, entityType: prismaEntityType, entityId },
          },
          data: { value },
        });
        // Annuler l'ancien, appliquer le nouveau
        const isNewUpvote = rawValue === 1;
        await this.updateReputation(ownerId, !isNewUpvote, false); // annuler l'ancien
        await this.updateReputation(ownerId, isNewUpvote, true);   // ajouter le nouveau
        return { action: 'changed', newScore: await this.getScore(entityType, entityId) };
      }
    }

    // Nouveau vote
    await this.prisma.vote.create({
      data: {
        userId,
        entityType: prismaEntityType,
        entityId,
        value,
      },
    });
    await this.updateReputation(ownerId, rawValue === 1, true);
    return { action: 'added', newScore: await this.getScore(entityType, entityId) };
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
    } else {
      const answer = await this.prisma.answer.findUnique({
        where:  { id: entityId },
        select: { userId: true },
      });
      return answer?.userId ?? null;
    }
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

  private async updateReputation(
    ownerId: string,
    isUpvote: boolean,
    isAdding: boolean,
  ) {
    const delta = isUpvote
      ? isAdding ? 10 : -10
      : isAdding ? -2 : 2;

    await this.prisma.user.update({
      where: { id: ownerId },
      data:  { reputation: { increment: delta } },
    });
  }
}
