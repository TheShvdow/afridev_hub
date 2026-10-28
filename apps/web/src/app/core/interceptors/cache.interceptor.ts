import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EMPTY, Observable, catchError, concat, filter, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStore } from '../store/auth.store';
import { HttpCacheService } from '../cache/http-cache.service';
import { apiPath, freshnessOf, isCacheableRead, writeInvalidatesCache } from '../cache/cache-policy';

// Requêtes de lecture en cours, partagées : deux composants qui demandent la même page
// n'envoient qu'un seul appel.
const inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

const copy = <T>(value: T): T => (value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T));

/**
 * Cache des lectures, « périmé mais affiché » :
 * - moins de 30 s : la réponse du cache, sans appel réseau ;
 * - jusqu'à 10 min : la réponse du cache tout de suite, puis la version fraîche si elle a changé ;
 * - au-delà ou sans entrée : appel réseau.
 * Toute écriture réussie (publier, voter, modifier, se connecter…) vide le cache.
 *
 * Placé après `envelopeInterceptor` : le cache garde la réponse brute de l'API et l'enveloppe
 * est retirée à chaque sortie, du cache comme du réseau.
 */
export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) return next(req);

  const cache = inject(HttpCacheService);
  const path = apiPath(req.url, environment.apiUrl);

  if (writeInvalidatesCache(req.method, path)) {
    return next(req).pipe(tap((event) => {
      if (event instanceof HttpResponse && event.ok) cache.clear();
    }));
  }
  if (!isCacheableRead(req.method, path)) return next(req);

  // Un jeton sans profil chargé : on ignore le cache, le profil décide des données propres au membre.
  const auth = inject(AuthStore);
  const me = auth.currentUser();
  if (auth.accessToken() && !me) return next(req);

  const key = `${me?.id ?? 'anon'}|${req.urlWithParams}`;
  const hit = cache.get(key);
  const state = hit ? freshnessOf(hit.storedAt, Date.now()) : 'expired';

  const network$ = (): Observable<HttpResponse<unknown>> => {
    let shared = inFlight.get(key);
    if (!shared) {
      const generation = cache.currentGeneration;
      shared = next(req).pipe(
        tap((event) => {
          if (event instanceof HttpResponse && event.ok) cache.set(key, event.body, generation);
        }),
        finalize(() => inFlight.delete(key)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
      inFlight.set(key, shared);
    }
    return shared.pipe(filter((event): event is HttpResponse<unknown> => event instanceof HttpResponse));
  };

  const fromCache = (body: unknown) => new HttpResponse({ body: copy(body), status: 200, url: req.url });

  if (hit && state === 'fresh') return of(fromCache(hit.body));

  if (hit && state === 'stale') {
    const shown = JSON.stringify(hit.body);
    const refreshed$ = network$().pipe(
      filter((response) => JSON.stringify(response.body) !== shown),
      map((response) => response.clone({ body: copy(response.body) })),
      catchError(() => EMPTY),
    );
    return concat(of(fromCache(hit.body)), refreshed$);
  }

  return network$().pipe(map((response) => response.clone({ body: copy(response.body) })));
};
