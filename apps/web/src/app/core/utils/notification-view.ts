import { AppNotification } from '../services/notifications.service';

/** Page où mener le membre : le lien enregistré, sinon une page par défaut selon le type. */
export function notificationLink(notification: AppNotification): string | null {
  if (notification.link) return notification.link;

  switch (notification.type) {
    case 'NEW_ANSWER':
    case 'ANSWER_ACCEPTED':
    case 'VOTE_RECEIVED':
      return '/forum';
    case 'JOB_ALERT':
    case 'JOB_APPLICATION':
    case 'JOB_REVIEWED':
      return '/jobs';
    case 'BADGE_AWARDED':
      return '/profile';
    default:
      return null;
  }
}
