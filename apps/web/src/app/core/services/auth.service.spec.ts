import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

const API = 'http://localhost:3000/api';

describe('AuthService — OAuth', () => {
  let service: AuthService;
  let fetchMock: jest.Mock;
  const originalFetch = (globalThis as { fetch?: unknown }).fetch;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);

    // `fetch` n'existe pas dans l'environnement jsdom des tests.
    fetchMock = jest.fn();
    (globalThis as unknown as { fetch: jest.Mock }).fetch = fetchMock;
  });

  afterEach(() => {
    (globalThis as unknown as { fetch?: unknown }).fetch = originalFetch;
  });

  it('démarre le flux GitHub sur l\'endpoint de l\'API', () => {
    // L'API répond par une redirection (302) vers la page d'autorisation de
    // GitHub : la page doit donc être ouverte dans le navigateur.
    expect(service.githubAuthUrl).toBe(`${API}/auth/github`);
  });

  it('démarre le flux Google sur l\'endpoint de l\'API', () => {
    expect(service.googleAuthUrl).toBe(`${API}/auth/google`);
  });

  it('interroge la route de l\'API sans suivre la redirection', (done) => {
    // Une redirection opaque (302 vers GitHub) : le navigateur quitte
    // l'application.
    fetchMock.mockResolvedValue({ type: 'opaqueredirect', status: 0 });

    service.startOAuth(`${API}/auth/github`).subscribe((redirected) => {
      expect(redirected).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(`${API}/auth/github`, {
        redirect: 'manual',
        credentials: 'include',
      });
      done();
    });
  });

  it('signale un fournisseur non configuré quand l\'API ne redirige pas', (done) => {
    // Réponse opaque = l'API a renvoyé une erreur (route inconnue,
    // identifiants OAuth absents) au lieu de rediriger vers le fournisseur.
    fetchMock.mockResolvedValue({ type: 'opaque', status: 0 });

    service.startOAuth(`${API}/auth/github`).subscribe((redirected) => {
      expect(redirected).toBe(false);
      done();
    });
  });
});
