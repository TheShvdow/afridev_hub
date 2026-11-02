import { Injectable, PLATFORM_ID, effect, inject, signal, untracked } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';
import type { Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { HttpCacheService } from '../cache/http-cache.service';
import { AuthStore } from '../store/auth.store';
import { AppNotification, NotificationsService } from './notifications.service';
import { ToastService } from './toast.service';

/** Événement `reputation` de la passerelle : nouveau total, variation et raison. */
export interface ReputationUpdate {
  reputation: number;
  delta: number;
  reason: string;
}

/** Après une coupure décidée par le serveur (jeton expiré), on retente quelques fois avec un jeton renouvelé. */
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 5000;

// Connexion Socket.IO à l'espace `/notifications` tant que le membre est connecté : notifications et
// réputation arrivent sans recharger la page. Le serveur ne vérifie le jeton qu'à la connexion.
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly authStore = inject(AuthStore);
  private readonly notificationsApi = inject(NotificationsService);
  private readonly toast = inject(ToastService);
  private readonly readCache = inject(HttpCacheService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Nombre de notifications non lues, partagé par la barre de navigation et la page des notifications. */
  readonly unreadCount = signal(0);
  readonly connected = signal(false);
  /** Notifications reçues en direct, pour la page qui les affiche. */
  readonly notification$ = new Subject<AppNotification>();

  private socket: Socket | null = null;
  private connecting = false;
  private reconnectAttempts = 0;

  constructor() {
    effect(() => {
      const authenticated = this.authStore.isAuthenticated();
      untracked(() => (authenticated ? void this.connect() : this.disconnect()));
    });
  }

  /** Relit le compteur de non lues auprès de l'API. */
  refreshUnread(): void {
    this.notificationsApi.unreadCount().subscribe({
      next: ({ count }) => this.unreadCount.set(count),
      error: () => undefined,
    });
  }

  private async connect(): Promise<void> {
    if (!this.isBrowser || this.socket || this.connecting) return;
    this.connecting = true;

    this.refreshUnread();

    // Le client Socket.IO n'est chargé qu'une fois le membre connecté : il n'alourdit pas la première page.
    const { io } = await import('socket.io-client');
    this.connecting = false;

    // Le membre s'est déconnecté pendant le chargement : rien à ouvrir.
    if (!this.authStore.isAuthenticated() || this.socket) return;

    // `auth` est une fonction : chaque tentative de reconnexion repart avec le jeton courant.
    const socket = io(`${environment.wsUrl}/notifications`, {
      auth: (callback) => callback({ token: this.authStore.accessToken() }),
      reconnectionDelayMax: 10_000,
    });
    this.socket = socket;

    socket.on('connect', () => {
      this.connected.set(true);
      this.reconnectAttempts = 0;
      // Rattrape ce qui est arrivé pendant une coupure.
      this.refreshUnread();
    });

    socket.on('disconnect', (reason) => {
      this.connected.set(false);
      // Coupure décidée par le serveur (jeton refusé) : Socket.IO ne se reconnecte pas seul.
      if (reason === 'io server disconnect') this.retryAfterServerDisconnect(socket);
    });

    socket.on('notification', (notification: AppNotification) => {
      // Une notification annonce un changement (réponse, vote, candidature…) : les pages gardées sont périmées.
      this.readCache.clear();
      this.unreadCount.update((count) => count + 1);
      this.notification$.next(notification);
      this.toast.info(notification.title ?? notification.message);
    });

    socket.on('reputation', (update: ReputationUpdate) => this.onReputation(update));
  }

  private disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connected.set(false);
    this.reconnectAttempts = 0;
    this.unreadCount.set(0);
  }

  /** Un appel API authentifié renouvelle le jeton si besoin (intercepteur), puis on se reconnecte. */
  private retryAfterServerDisconnect(socket: Socket): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
    this.reconnectAttempts += 1;

    setTimeout(() => {
      if (this.socket !== socket || !this.authStore.isAuthenticated()) return;

      this.notificationsApi.unreadCount().subscribe({
        next: ({ count }) => {
          this.unreadCount.set(count);
          if (this.socket === socket) socket.connect();
        },
        error: () => this.retryAfterServerDisconnect(socket),
      });
    }, RECONNECT_DELAY_MS);
  }

  private onReputation({ reputation, delta }: ReputationUpdate): void {
    const user = this.authStore.currentUser();
    if (user) this.authStore.setUser({ ...user, reputation });

    if (delta > 0) this.toast.success(`+${delta} point${delta > 1 ? 's' : ''} de réputation`);
  }
}
