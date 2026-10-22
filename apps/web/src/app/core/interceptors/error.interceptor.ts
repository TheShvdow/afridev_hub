import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { extractApiErrorMessage } from '../utils/api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ne pas afficher de toast sur les 401 (géré par authInterceptor)
      if (error.status === 401) {
        return throwError(() => error);
      }

      toast.error(extractApiErrorMessage(error));

      return throwError(() => error);
    })
  );
};
