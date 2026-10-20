import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { ForumAnswerCreatedEvent, ForumAnswerAcceptedEvent, VotesVoteChangedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

// FR-18 : notifications d'activité du forum, déclenchées par les événements de domaine.
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('forum.answer.created')
  onAnswerCreated(event: ForumAnswerCreatedEvent) {
    return this.safely('NEW_ANSWER', () =>
      this.notifications.notifyNewAnswer(event.postAuthorId, event.answerId, event.postId, event.authorId),
    );
  }

  @OnEvent('forum.answer.accepted')
  onAnswerAccepted(event: ForumAnswerAcceptedEvent) {
    return this.safely('ANSWER_ACCEPTED', () =>
      this.notifications.notifyAnswerAccepted(event.answerAuthorId, event.answerId, event.postId, event.acceptedById),
    );
  }

  // Seul un nouveau vote positif notifie : ni l'annulation, ni le vote négatif.
  @OnEvent('votes.vote.changed')
  onVoteChanged(event: VotesVoteChangedEvent) {
    if (event.next !== 'UP' || event.previous === 'UP') return;
    return this.safely('VOTE_RECEIVED', async () => {
      const postId = event.entityType === 'POST'
        ? event.entityId
        : (await this.prisma.answer.findUnique({ where: { id: event.entityId }, select: { postId: true } }))?.postId ?? null;
      return this.notifications.notifyUpvote(event.targetOwnerId, event.entityType, event.entityId, postId, event.voterId);
    });
  }

  // L'action métier est déjà faite : une notification perdue ne doit pas la faire échouer.
  private async safely(type: string, send: () => Promise<unknown>) {
    try {
      await send();
    } catch (error) {
      this.logger.error(`Notification ${type} non créée`, error instanceof Error ? error.stack : String(error));
    }
  }
}
