import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { errorInterceptor } from './error.interceptor';
import { SILENT_ERROR } from './silent-error';
import { ToastService } from '../services/toast.service';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let toastError: jest.Mock;

  beforeEach(() => {
    toastError = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: ToastService, useValue: { error: toastError } },
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('affiche un toast sur une erreur de l\'API', () => {
    http.get('/api/une-route').subscribe({ error: () => undefined });

    controller
      .expectOne('/api/une-route')
      .flush(
        { error: { code: 'COMMON_INTERNAL_ERROR', message: 'Erreur interne.' } },
        { status: 500, statusText: 'Internal Server Error' }
      );

    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('n\'affiche pas de toast pour une requête marquée comme silencieuse', () => {
    http
      .get('/api/une-route', { context: new HttpContext().set(SILENT_ERROR, true) })
      .subscribe({ error: () => undefined });

    controller
      .expectOne('/api/une-route')
      .flush(
        { error: { code: 'COMMON_VALIDATION_FAILED', message: 'Requête invalide.' } },
        { status: 400, statusText: 'Bad Request' }
      );

    expect(toastError).not.toHaveBeenCalled();
  });
});
