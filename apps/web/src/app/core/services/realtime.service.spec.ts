import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { RealtimeService } from './realtime.service';
import { NotificationsService } from './notifications.service';
import { ToastService } from './toast.service';
import { AuthStore } from '../store/auth.store';

type Handler = (...args: unknown[]) => void;

const handlers = new Map<string, Handler>();
const socket = { on: jest.fn(), disconnect: jest.fn(), connect: jest.fn() };
const ioMock = jest.fn(() => socket);

jest.mock('socket.io-client', () => ({ io: (...args: unknown[]) => (ioMock as unknown as (...a: unknown[]) => unknown)(...args) }));

describe('RealtimeService', () => {
  const authenticated = signal(false);
  const accessToken = signal<string | null>(null);
  const auth = { isAuthenticated: authenticated, accessToken, currentUser: jest.fn(), setUser: jest.fn() };
  const notifications = { unreadCount: jest.fn() };
  const toast = { info: jest.fn(), success: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: auth },
        { provide: NotificationsService, useValue: notifications },
        { provide: ToastService, useValue: toast },
      ],
    });
    const service = TestBed.inject(RealtimeService);
    TestBed.flushEffects();
    return service;
  }

  /** Laisse l'import différé du client Socket.IO se résoudre. */
  const flushPromises = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };

  async function login(token = 'jwt-1') {
    accessToken.set(token);
    authenticated.set(true);
    TestBed.flushEffects();
    await flushPromises();
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    handlers.clear();
    socket.on.mockImplementation(((event: string, handler: Handler) => {
      handlers.set(event, handler);
      return socket;
    }) as never);
    ioMock.mockReturnValue(socket);
    authenticated.set(false);
    accessToken.set(null);
    notifications.unreadCount.mockReturnValue(of({ count: 4 }));
  });

  afterEach(() => jest.useRealTimers());

  it('does not connect while logged out', async () => {
    create();

    expect(ioMock).not.toHaveBeenCalled();
  });

  it('connects to the notifications namespace with the current token once logged in, and loads the unread count', async () => {
    const service = create();

    await login('jwt-1');

    expect(ioMock).toHaveBeenCalledTimes(1);
    const [url, options] = ioMock.mock.calls[0] as unknown as [string, { auth: (cb: (data: unknown) => void) => void }];
    expect(url).toMatch(/\/notifications$/);
    const sent: unknown[] = [];
    options.auth((data) => sent.push(data));
    expect(sent).toEqual([{ token: 'jwt-1' }]);
    expect(service.unreadCount()).toBe(4);
  });

  it('counts, shows and publishes a notification received live', async () => {
    const service = create();
    await login();
    const received: unknown[] = [];
    service.notification$.subscribe((notification) => received.push(notification));

    handlers.get('notification')?.({ id: 'n1', title: 'Nouvelle réponse à votre question', message: 'x' });

    expect(service.unreadCount()).toBe(5);
    expect(toast.info).toHaveBeenCalledWith('Nouvelle réponse à votre question');
    expect(received).toHaveLength(1);
  });

  it('updates the reputation of the signed-in member and congratulates a gain', async () => {
    create();
    auth.currentUser.mockReturnValue({ id: 'u1', reputation: 10 });
    await login();

    handlers.get('reputation')?.({ reputation: 25, delta: 15, reason: 'ANSWER_ACCEPTED' });

    expect(auth.setUser).toHaveBeenCalledWith({ id: 'u1', reputation: 25 });
    expect(toast.success).toHaveBeenCalledWith('+15 points de réputation');
  });

  it('stays silent on a reputation loss', async () => {
    create();
    auth.currentUser.mockReturnValue({ id: 'u1', reputation: 10 });
    await login();

    handlers.get('reputation')?.({ reputation: 8, delta: -2, reason: 'VOTE_DOWN' });

    expect(auth.setUser).toHaveBeenCalledWith({ id: 'u1', reputation: 8 });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('refreshes the unread count when the connection comes back', async () => {
    create();
    await login();
    notifications.unreadCount.mockClear();

    handlers.get('connect')?.();

    expect(notifications.unreadCount).toHaveBeenCalledTimes(1);
  });

  it('reconnects with a fresh token after the server closed the connection', async () => {
    create();
    await login();
    notifications.unreadCount.mockClear();

    handlers.get('disconnect')?.('io server disconnect');
    jest.advanceTimersByTime(5000);

    expect(notifications.unreadCount).toHaveBeenCalledTimes(1);
    expect(socket.connect).toHaveBeenCalledTimes(1);
  });

  it('gives up reconnecting after 5 failed attempts', async () => {
    create();
    await login();
    notifications.unreadCount.mockReturnValue(throwError(() => ({ status: 0 })));

    handlers.get('disconnect')?.('io server disconnect');
    jest.advanceTimersByTime(5000 * 10);

    // 1 appel initial à la connexion déjà passé + 5 tentatives de reconnexion au plus.
    expect(socket.connect).not.toHaveBeenCalled();
    expect(notifications.unreadCount.mock.calls.length).toBeLessThanOrEqual(7);
  });

  it('closes the socket and resets the counter on logout', async () => {
    const service = create();
    await login();

    authenticated.set(false);
    TestBed.flushEffects();
    await flushPromises();

    expect(socket.disconnect).toHaveBeenCalled();
    expect(service.unreadCount()).toBe(0);
  });
});
