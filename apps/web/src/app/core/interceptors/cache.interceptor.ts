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

/** Identifiant du membre porté par un jeton JWT (`sub`), ou null si le jeton est illisible. */
function subjectOf(token: string): string | null {
  try {
    const payload = token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/');
    const sub = (JSON.parse(atob(payload)) as { sub?: unknown }).sub;
    return typeof sub === 'string' && sub ? sub : null;
  } catch {
    return null;
  }
}

/** Numéro de page demandé (1 sans paramètre `page`). */
const pageOf = (urlWithParams: string): number => Number(new URL(urlWithParams, 'https://local.invalid').searchParams.get('page') ?? 1) || 1;

const copy = <T>(value: T): T => (value === undefined ? value : structuredClone(value));

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

  // Les entrées sont rangées par membre. Le profil n'est chargé qu'après le premier appel d'une
  // page rechargée : en attendant, l'identifiant se lit dans le jeton (`sub`), qui ne sert ici
  // qu'à séparer les comptes, jamais à décider d'un droit. Jeton illisible : pas de cache.
  const auth = inject(AuthStore);
  const token = auth.accessToken();
  const owner = auth.currentUser()?.id ?? (token ? subjectOf(token) : 'anon');
  if (!owner) return next(req);

  const key = `${owner}|${req.urlWithParams}`;
  const hit = cache.get(key);
  let state = hit ? freshnessOf(hit.storedAt, Date.now()) : 'expired';
  // Les pages suivantes d'une liste s'ajoutent à l'écran : deux réponses de suite les ajouteraient
  // deux fois. Une entrée périmée de la page 2 ou plus repart donc sur le réseau, sans double affichage.
  if (state === 'stale' && pageOf(req.urlWithParams) > 1) state = 'expired';

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
