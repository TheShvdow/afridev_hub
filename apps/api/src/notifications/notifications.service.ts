import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
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
  // Chemin côté web (ex. /forum/<id>) : sert au lien de l'email, n'est pas stocké.
  link?:        string;
}

// Types envoyés aussi par email (FR-18), sauf si le membre a désactivé les emails.
const EMAIL_TYPES: NotificationType[] = ['NEW_ANSWER', 'ANSWER_ACCEPTED', 'VOTE_RECEIVED'];

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly mail?: MailService,
    private readonly config?: ConfigService,
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

    // Email en arrière-plan : son échec n'annule pas la notification in-app.
    if (EMAIL_TYPES.includes(input.type)) {
      this.sendEmail(input).catch((error) =>
        this.logger.error(`Email de notification non envoyé (${input.type})`, error instanceof Error ? error.stack : String(error)),
      );
    }

    return notification;
  }

  private async sendEmail(input: CreateNotificationInput) {
    if (!this.mail) return;
    const user = await this.prisma.user.findUnique({
      where:  { id: input.userId },
      select: { email: true, emailNotifications: true },
    });
    if (!user?.emailNotifications) return;

    const webUrl = this.config?.get<string>('WEB_URL') ?? 'http://localhost:4200';
    const url = `${webUrl}${input.link ?? '/notifications'}`;
    const html = `
      <p>${escapeHtml(input.message)}</p>
      <p><a href="${escapeHtml(url)}">Voir sur AfriDev Hub</a></p>
      <p style="color:#666;font-size:12px">Vous pouvez désactiver ces emails dans vos préférences de notification.</p>`;
    await this.mail.send(user.email, input.title, html);
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
      link:       `/forum/${postId}`,
    });
  }

  async notifyAnswerAccepted(answerAuthorId: string, answerId: string, postId: string, actorId: string) {
    return this.create({
      userId:     answerAuthorId,
      type:       'ANSWER_ACCEPTED',
      title:      'Votre réponse a été acceptée !',
      message:    'L\'auteur de la question a accepté votre réponse.',
      targetType: 'ANSWER',
      targetId:   answerId,
      actorId,
      link:       `/forum/${postId}`,
    });
  }

  async notifyUpvote(targetUserId: string, targetType: string, targetId: string, postId: string | null, actorId: string) {
    return this.create({
      userId:     targetUserId,
      type:       'VOTE_RECEIVED',
      title:      'Vote positif reçu',
      message:    'Quelqu\'un a voté positivement pour votre contenu.',
      targetType,
      targetId,
      actorId,
      ...(postId && { link: `/forum/${postId}` }),
    });
  }
}
