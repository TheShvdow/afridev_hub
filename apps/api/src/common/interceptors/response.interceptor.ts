import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

// Enveloppe de succès AD-7 : { data } ; les listes gardent { data, meta } tel que produit par le service.
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (typeof result === 'object' && result !== null && 'data' in result) {
          return result;
        }
        return { data: result ?? null };
      }),
    );
  }
}
