import { Directive, HostListener, PLATFORM_ID, inject, input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

/**
 * Charge à l'avance la page qu'un clic va ouvrir : au survol ou au focus, la lecture part et son
 * résultat entre dans le cache des lectures. Au clic, la page s'affiche sans attente.
 * Rien n'est lancé quand le navigateur demande d'économiser les données.
 */
@Directive({ selector: '[appPrefetch]', standalone: true })
export class PrefetchDirective {
  /** Chemin sous l'API (`/forum/posts/{id}`), ou null pour ne rien charger. */
  readonly appPrefetch = input<string | null | undefined>();

  private readonly http = inject(HttpClient, { optional: true });
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  @HostListener('mouseenter')
  @HostListener('focus')
  prefetch(): void {
    const path = this.appPrefetch();
    if (!path || !this.browser || !this.http) return;
    if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;

    this.http.get(`${environment.apiUrl}${path}`).subscribe({ error: () => undefined });
  }
}
