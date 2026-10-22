import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

/**
 * L'API enveloppe chaque réponse succès dans `{ data }` (convention AD-7).
 * Ce retirateur rend le payload utile au consommateur, afin que les services
 * puissent typer directement `AuthTokens`, `UserMe`, etc.
 *
 * Les réponses paginées `{ data, meta }` sont conservées telles quelles :
 * `meta` porte la pagination et ne doit pas être perdu.
 */
export const envelopeInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map((event) => {
      if (!(event instanceof HttpResponse)) return event;

      const body = event.body;
      if (
        body !== null &&
        typeof body === 'object' &&
        'data' in body &&
        !('meta' in body)
      ) {
        return event.clone({ body: (body as { data: unknown }).data });
      }

      return event;
    })
  );
