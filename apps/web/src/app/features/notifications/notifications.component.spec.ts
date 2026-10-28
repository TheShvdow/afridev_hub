import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RealtimeService } from '../../core/services/realtime.service';
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

  const live$ = new Subject<AppNotification>();
  const realtime = { unreadCount: signal(0), notification$: live$ };

  function create() {
    TestBed.configureTestingModule({
      imports: [NotificationsComponent],
      providers: [provideRouter([]), { provide: NotificationsService, useValue: api }, { provide: RealtimeService, useValue: realtime }],
    });
    const fixture = TestBed.createComponent(NotificationsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    realtime.unreadCount.set(0);
  });

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

  it('puts a notification received live at the top of the list and counts it as unread', () => {
    api.list.mockReturnValue(of(page([notification('p1')], 1)));
    const fixture = create();

    live$.next(notification('live-1', { title: 'Nouvelle réponse reçue en direct' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.items().map((item) => item.id)).toEqual(['live-1', 'p1']);
    expect(fixture.componentInstance.unreadCount()).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Nouvelle réponse reçue en direct');
  });

  it('does not duplicate a notification already in the list', () => {
    api.list.mockReturnValue(of(page([notification('p1')], 1)));
    const fixture = create();

    live$.next(notification('p1'));

    expect(fixture.componentInstance.items()).toHaveLength(1);
  });

  it('keeps the shared unread counter in sync when reading', () => {
    api.list.mockReturnValue(of(page([notification('p1')], 3)));
    api.markAsRead.mockReturnValue(of(undefined));
    api.markAllAsRead.mockReturnValue(of(undefined));
    const fixture = create();
    jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(realtime.unreadCount()).toBe(3);

    fixture.componentInstance.open(fixture.componentInstance.items()[0]);
    expect(realtime.unreadCount()).toBe(2);

    fixture.componentInstance.markAllAsRead();
    expect(realtime.unreadCount()).toBe(0);
  });
});
