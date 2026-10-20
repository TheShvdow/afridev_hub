import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { VotesVoteChangedEvent, VoteValue } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';

const SCORE: Record<VoteValue, number> = { UP: 1, DOWN: -1 };

const scoreOf = (value: VoteValue | null): number => (value ? SCORE[value] : 0);

// Tient à jour Post.voteScore et Answer.voteScore (tri « votes ») à partir des votes.
// VotesModule n'écrit que des Vote ; le forum réagit à l'événement.
@Injectable()
export class ForumListener {
  private readonly logger = new Logger(ForumListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('votes.vote.changed')
  async onVoteChanged(event: VotesVoteChangedEvent) {
    const delta = scoreOf(event.next) - scoreOf(event.previous);
    if (delta === 0) return;

    const data = { voteScore: { increment: delta } };
    try {
      if (event.entityType === 'POST') {
        await this.prisma.post.update({ where: { id: event.entityId }, data });
      } else {
        await this.prisma.answer.update({ where: { id: event.entityId }, data });
      }
    } catch (error) {
      // Le vote est déjà enregistré : un score décalé ne doit pas faire échouer la requête.
      this.logger.error(`voteScore non mis à jour (${event.entityType} ${event.entityId})`, error instanceof Error ? error.stack : String(error));
    }
  }
}
