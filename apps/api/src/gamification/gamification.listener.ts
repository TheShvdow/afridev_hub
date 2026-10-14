import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type {
  ForumQuestionCreatedEvent,
  ForumAnswerCreatedEvent,
  ForumAnswerAcceptedEvent,
  VotesVoteChangedEvent,
  VoteValue,
} from '@afridev/shared-types';
import { GamificationService } from './gamification.service';

// Règles de réputation — glossaire BMAD « Réputation ».
// Seul ce module écrit User.reputation (spine AD-2).
const REPUTATION_RULES = {
  QUESTION_ASKED: 5,
  ANSWER_GIVEN: 10,
  ANSWER_ACCEPTED: 15,
} as const;

const VOTE_POINTS: Record<VoteValue, number> = {
  UP: 10,
  DOWN: -2,
};

const pointsFor = (value: VoteValue | null): number => (value ? VOTE_POINTS[value] : 0);

@Injectable()
export class GamificationListener {
  private readonly logger = new Logger(GamificationListener.name);

  constructor(private readonly gamification: GamificationService) {}

  @OnEvent('forum.question.created')
  onQuestionCreated(event: ForumQuestionCreatedEvent) {
    return this.apply(event.authorId, REPUTATION_RULES.QUESTION_ASKED, 'question_asked', event.postId);
  }

  @OnEvent('forum.answer.created')
  onAnswerCreated(event: ForumAnswerCreatedEvent) {
    return this.apply(event.authorId, REPUTATION_RULES.ANSWER_GIVEN, 'answer_given', event.answerId);
  }

  @OnEvent('forum.answer.accepted')
  onAnswerAccepted(event: ForumAnswerAcceptedEvent) {
    return this.apply(event.answerAuthorId, REPUTATION_RULES.ANSWER_ACCEPTED, 'answer_accepted', event.answerId);
  }

  // Badge « dev vérifié » : réévalué à chaque changement de profil ou de vérification email.
  @OnEvent('users.profile.updated')
  onProfileUpdated(event: { userId: string }) {
    return this.syncBadge(event.userId);
  }

  @OnEvent('auth.email.verified')
  onEmailVerified(event: { userId: string }) {
    return this.syncBadge(event.userId);
  }

  private async syncBadge(userId: string) {
    try {
      await this.gamification.syncVerifiedBadge(userId);
    } catch (error) {
      this.logger.error(`Badge vérifié non synchronisé (user ${userId})`, error instanceof Error ? error.stack : String(error));
    }
  }

  // Le delta est calculé à partir de l'état avant/après : couvre ajout, changement et annulation.
  @OnEvent('votes.vote.changed')
  onVoteChanged(event: VotesVoteChangedEvent) {
    const delta = pointsFor(event.next) - pointsFor(event.previous);
    if (delta === 0) return;
    return this.apply(event.targetOwnerId, delta, 'vote_changed', event.entityId);
  }

  private async apply(userId: string, delta: number, reason: string, entityId: string) {
    try {
      await this.gamification.addReputation({ userId, delta, reason, entityId });
    } catch (error) {
      // Un échec de réputation ne doit pas annuler l'action métier déjà effectuée.
      this.logger.error(`Réputation non appliquée (${reason}, user ${userId})`, error instanceof Error ? error.stack : String(error));
    }
  }
}
