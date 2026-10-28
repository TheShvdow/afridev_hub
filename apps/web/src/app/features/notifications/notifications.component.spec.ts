import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NotificationsComponent } from './notifications.component';
import { AppNotification, NotificationsService } from '../../core/services/notifications.service';

function notification(id: string, overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id,
    type: 'NEW_ANSWER',
    title: 'Nouvelle réponse à votre question',
    message: 'Quelqu\'un a répondu.',
    link: `/forum/${id}`,
    isRead: false,
    createdAt: new Date().toISOString(),
    actor: { id: 'u2', username: 'kwame', displayName: 'Kwame A.', avatarUrl: null },
    ...overrides,
  };
}

const page = (data: AppNotification[], unreadCount: number, pageNumber = 1, totalPages = 1) => ({
  data,
  meta: { total: data.length, page: pageNumber, limit: 20, totalPages, unreadCount },
});

describe('NotificationsComponent', () => {
  const api = { list: jest.fn(), markAsRead: jest.fn(), markAllAsRead: jest.fn(), unreadCount: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [provideRouter([]), { provide: NotificationsService, useValue: api }],
    });
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => jest.resetAllMocks());

  it('lists the notifications with the unread count', () => {
    api.list.mockReturnValue(of(page([notification('p1'), notification('p2', { isRead: true })], 1)));
    const fixture = create();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('1 non lue');
    expect(text).toContain('Kwame A.');
    expect(fixture.componentInstance.items().length).toBe(2);
  });

  it('marks a notification as read and opens its target', () => {
    api.list.mockReturnValue(of(page([notification('p1')], 1)));
    api.markAsRead.mockReturnValue(of(undefined));
    const fixture = create();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance.open(fixture.componentInstance.items()[0]);

    expect(api.markAsRead).toHaveBeenCalledWith('p1');
    expect(navigate).toHaveBeenCalledWith('/forum/p1');
    expect(fixture.componentInstance.unreadCount()).toBe(0);
    expect(fixture.componentInstance.items()[0].isRead).toBe(true);
  });

  it('marks everything as read', () => {
    api.list.mockReturnValue(of(page([notification('p1'), notification('p2')], 2)));
    api.markAllAsRead.mockReturnValue(of(undefined));
    const fixture = create();

    fixture.componentInstance.markAllAsRead();

    expect(fixture.componentInstance.unreadCount()).toBe(0);
    expect(fixture.componentInstance.items().every((item) => item.isRead)).toBe(true);
  });

  it('shows the API error and retries', () => {
    api.list
      .mockReturnValueOnce(throwError(() => ({ status: 500, error: { error: { message: 'Erreur interne du serveur.' } } })))
      .mockReturnValueOnce(of(page([notification('p1')], 1)));
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Erreur interne du serveur.');

    fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(fixture.componentInstance.items().length).toBe(1);
  });
});
