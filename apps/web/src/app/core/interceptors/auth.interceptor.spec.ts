import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { envelopeInterceptor } from './envelope.interceptor';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from '../store/auth.store';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(
          withInterceptors([envelopeInterceptor, authInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('ajoute le token d\'accès sur les requêtes authentifiées', () => {
    store.setTokens('at-1', 'rt-1');

    http.get('/api/forum/posts').subscribe();

    const request = controller.expectOne('/api/forum/posts');
    expect(request.request.headers.get('Authorization')).toBe('Bearer at-1');
    request.flush({ data: [] });
  });

  it('rafraîchit le token et rejoue la requête après un 401', () => {
    store.setTokens('expired-at', 'rt-1');

    let received: unknown;
    http.get('/api/forum/posts').subscribe((body) => (received = body));

    // La requête échoue sur un access token expiré.
    controller
      .expectOne('/api/forum/posts')
      .flush({ error: { code: 'AUTH_TOKEN_INVALID', message: 'Token invalide.' } }, {
        status: 401,
        statusText: 'Unauthorized',
      });

    // Le refresh part avec le refresh token dans le corps, comme l'exige l'API.
    const refreshRequest = controller.expectOne((req) => req.url.endsWith('/auth/refresh'));
    expect(refreshRequest.request.body).toEqual({ refreshToken: 'rt-1' });
    refreshRequest.flush({
      data: { accessToken: 'new-at', refreshToken: 'new-rt' },
    });

    // La requête initiale est rejouée avec le nouveau token.
    const replayed = controller.expectOne('/api/forum/posts');
    expect(replayed.request.headers.get('Authorization')).toBe('Bearer new-at');
    replayed.flush({ data: [{ id: '1' }] });

    expect(received).toEqual([{ id: '1' }]);
    expect(store.accessToken()).toBe('new-at');
    expect(store.refreshToken()).toBe('new-rt');
  });

  it('ne tente pas de refresh sur les routes /auth/*', () => {
    store.setTokens('at-1', 'rt-1');

    http.post('/api/auth/login', { email: 'a@b.c', password: 'x' }).subscribe({ error: () => undefined });

    controller
      .expectOne('/api/auth/login')
      .flush({ error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Identifiants incorrects.' } }, {
        status: 401,
        statusText: 'Unauthorized',
      });

    // Aucun appel à /auth/refresh ne doit partir.
    controller.expectNone((req) => req.url.endsWith('/auth/refresh'));
  });

  it('rafraîchit le token sur /api/auth/me après un 401', () => {
    store.setTokens('expired-at', 'rt-1');

    http.get('/api/auth/me').subscribe();

    controller
      .expectOne('/api/auth/me')
      .flush({ error: { code: 'AUTH_TOKEN_INVALID', message: 'Token invalide.' } }, {
        status: 401,
        statusText: 'Unauthorized',
      });

    const refreshRequest = controller.expectOne((req) => req.url.endsWith('/auth/refresh'));
    refreshRequest.flush({ data: { accessToken: 'new-at', refreshToken: 'new-rt' } });

    const replayed = controller.expectOne('/api/auth/me');
    expect(replayed.request.headers.get('Authorization')).toBe('Bearer new-at');
    replayed.flush({ data: { id: 'user-1' } });
  });

  it('ne tente pas de refresh sur /api/auth/register', () => {
    store.setTokens('at-1', 'rt-1');

    http
      .post('/api/auth/register', { username: 'idrissa', email: 'a@b.c', password: 'x' })
      .subscribe({ error: () => undefined });

    controller
      .expectOne('/api/auth/register')
      .flush({ error: { code: 'AUTH_EMAIL_TAKEN', message: 'E-mail déjà utilisé.' } }, {
        status: 401,
        statusText: 'Unauthorized',
      });

    controller.expectNone((req) => req.url.endsWith('/auth/refresh'));
  });
});
