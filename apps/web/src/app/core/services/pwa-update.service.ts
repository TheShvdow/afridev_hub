import { Injectable, inject, isDevMode } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { ToastService } from './toast.service';

/**
 * Surveille les mises à jour du Service Worker Angular.
 * En production uniquement : propose un rechargement dès qu'une nouvelle version est prête.
 */
@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  private readonly updates = inject(SwUpdate, { optional: true });
  private readonly toast = inject(ToastService);

  init(): void {
    if (isDevMode() || !this.updates?.isEnabled) return;

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.toast.info('Nouvelle version disponible — rechargement…');
        void this.updates!.activateUpdate().then(() => document.location.reload());
      });

    this.updates.unrecoverable.subscribe(() => {
      this.toast.warning('L’application doit être rechargée.');
      document.location.reload();
    });

    // Vérifie périodiquement (onglet resté ouvert longtemps / PWA installée).
    const hour = 60 * 60 * 1000;
    setInterval(() => {
      void this.updates!.checkForUpdate().catch(() => undefined);
    }, hour);
  }
}
