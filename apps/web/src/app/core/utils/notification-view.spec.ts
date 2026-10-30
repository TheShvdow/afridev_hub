import { AppNotification } from '../services/notifications.service';
import { notificationLink } from './notification-view';

const base: AppNotification = {
  id: 'n1',
  type: 'SYSTEM',
  title: null,
  message: 'Bonjour',
  link: null,
  isRead: false,
  createdAt: new Date().toISOString(),
  actor: null,
};

describe('notificationLink', () => {
  it('prefers the stored link', () => {
    expect(notificationLink({ ...base, type: 'NEW_ANSWER', link: '/forum/p1' })).toBe('/forum/p1');
  });

  it('falls back to a page matching the type when no link was stored', () => {
    expect(notificationLink({ ...base, type: 'JOB_APPLICATION' })).toBe('/jobs');
    expect(notificationLink({ ...base, type: 'ANSWER_ACCEPTED' })).toBe('/forum');
    expect(notificationLink({ ...base, type: 'BADGE_AWARDED' })).toBe('/profile');
  });

  it('has no destination for a system message', () => {
    expect(notificationLink(base)).toBeNull();
  });
});
