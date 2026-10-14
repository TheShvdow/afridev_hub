import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  userId:       string;
  type:         NotificationType;
  title:        string;
  message:      string;
  targetType?:  string;
  targetId?:    string;
  actorId?:     string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        userId:     input.userId,
        type:       input.type,
        title:      input.title,
        message:    input.message,
        targetType: input.targetType,
        targetId:   input.targetId,
        actorId:    input.actorId,
      },
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Envoyer en temps réel via WebSocket
    this.gateway.sendToUser(input.userId, 'notification', notification);

    return notification;
  }

  // API publique exportée (story E2-6) : les autres modules notifient via cette méthode.
  async notify(userId: string, payload: Omit<CreateNotificationInput, 'userId'>) {
    return this.create({ userId, ...payload });
  }

  async list(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where:   { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          actor: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  // Helpers pour créer des notifications contextuelles

  async notifyNewAnswer(postAuthorId: string, answerId: string, postId: string, actorId: string) {
    return this.create({
      userId:     postAuthorId,
      type:       'NEW_ANSWER',
      title:      'Nouvelle réponse à votre question',
      message:    'Quelqu\'un a répondu à votre question.',
      targetType: 'ANSWER',
      targetId:   answerId,
      actorId,
    });
  }

  async notifyAnswerAccepted(answerAuthorId: string, answerId: string, actorId: string) {
    return this.create({
      userId:     answerAuthorId,
      type:       'ANSWER_ACCEPTED',
      title:      'Votre réponse a été acceptée !',
      message:    'L\'auteur de la question a accepté votre réponse.',
      targetType: 'ANSWER',
      targetId:   answerId,
      actorId,
    });
  }

  async notifyUpvote(targetUserId: string, targetType: string, targetId: string, actorId: string) {
    return this.create({
      userId:     targetUserId,
      type:       'VOTE_RECEIVED',
      title:      'Vote positif reçu',
      message:    'Quelqu\'un a voté positivement pour votre contenu.',
      targetType,
      targetId,
      actorId,
    });
  }
}
