import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { envelopeInterceptor } from './envelope.interceptor';

describe('envelopeInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([envelopeInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('dépouille l\'enveloppe { data } et renvoie le payload utile', () => {
    let received: unknown;

    http.get<{ accessToken: string }>('/api/auth/login').subscribe((body) => (received = body));

    controller
      .expectOne('/api/auth/login')
      .flush({ data: { accessToken: 'at', refreshToken: 'rt' } });

    expect(received).toEqual({ accessToken: 'at', refreshToken: 'rt' });
  });

  it('conserve les réponses paginées { data, meta }', () => {
    let received: unknown;

    http.get('/api/forum/posts').subscribe((body) => (received = body));

    controller.expectOne('/api/forum/posts').flush({
      data: [{ id: '1' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });

    expect(received).toEqual({
      data: [{ id: '1' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
  });

  it('laisse passer une réponse sans enveloppe', () => {
    let received: unknown;

    http.get('/api/health').subscribe((body) => (received = body));

    controller.expectOne('/api/health').flush('ok');

    expect(received).toBe('ok');
  });

  it('ne dépouille pas un corps null', () => {
    let received: unknown = 'non défini';

    http.get('/api/health').subscribe((body) => (received = body));

    controller.expectOne('/api/health').flush(null);

    expect(received).toBeNull();
  });
});
