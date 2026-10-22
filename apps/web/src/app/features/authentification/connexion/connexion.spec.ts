import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Connexion } from './connexion';
import { envelopeInterceptor } from '../../../core/interceptors/envelope.interceptor';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { AuthStore } from '../../../core/store/auth.store';
import { AuthService } from '../../../core/services/auth.service';

const API = 'http://localhost:3000/api';

describe('Connexion', () => {
  let component: Connexion;
  let fixture: ReturnType<typeof TestBed.createComponent<Connexion>>;
  let controller: HttpTestingController;
  let router: Router;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Connexion],
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([envelopeInterceptor, authInterceptor, errorInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Connexion);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    store = TestBed.inject(AuthStore);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    controller.verify();
  });

  function fillForm(email = 'idrissa@example.com', password = 'MotDePasse123!'): void {
    component.form.setValue({ email, password, remember: true });
  }

  it('connecte l\'utilisateur et stocke les tokens', () => {
    const navigate = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fillForm();
    component.submit();

    const request = controller.expectOne(`${API}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'idrissa@example.com',
      password: 'MotDePasse123!',
    });

    request.flush({
      data: { accessToken: 'at-1', refreshToken: 'rt-1' },
    });

    expect(store.accessToken()).toBe('at-1');
    expect(store.refreshToken()).toBe('rt-1');
    expect(localStorage.getItem('afridev_at')).toBe('at-1');
    expect(localStorage.getItem('afridev_rt')).toBe('rt-1');

    // Le profil est chargé en arrière-plan.
    controller.expectOne((req) => req.url.endsWith('/auth/me')).flush({
      data: {
        id: 'user-1',
        email: 'idrissa@example.com',
        username: 'idrissa_wade',
        displayName: null,
        avatarUrl: null,
        role: 'MEMBER',
        isVerified: false,
        reputation: 0,
        createdAt: '2026-10-20T16:53:59.632Z',
      },
    });

    expect(navigate).toHaveBeenCalledWith('/forum');
  });

  it('conserve la session dans l\'onglet quand « rester connecté » est décoché', () => {
    fillForm();
    component.form.controls.remember.setValue(false);

    component.submit();

    controller.expectOne(`${API}/auth/login`).flush({
      data: { accessToken: 'at-1', refreshToken: 'rt-1' },
    });

    expect(localStorage.getItem('afridev_at')).toBeNull();
    expect(sessionStorage.getItem('afridev_at')).toBe('at-1');

    controller.expectOne((req) => req.url.endsWith('/auth/me')).flush({ data: {} });
  });

  it('affiche le message de l\'API quand les identifiants sont incorrects', () => {
    fillForm('idrissa@example.com', 'MauvaisMotDePasse1');
    component.submit();

    controller.expectOne(`${API}/auth/login`).flush(
      {
        error: {
          code: 'AUTH_INVALID_CREDENTIALS',
          message: 'Email ou mot de passe incorrect.',
        },
      },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(component.errorMessage()).toBe('Email ou mot de passe incorrect.');
    expect(component.loading()).toBe(false);
    expect(store.accessToken()).toBeNull();
  });

  it('affiche les détails de validation renvoyés par l\'API', () => {
    fillForm();
    component.submit();

    controller.expectOne(`${API}/auth/login`).flush(
      {
        error: {
          code: 'COMMON_VALIDATION_FAILED',
          message: 'Requête invalide.',
          details: ['Le mot de passe doit contenir au moins 8 caractères.'],
        },
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toContain('Requête invalide.');
    expect(component.errorMessage()).toContain(
      'Le mot de passe doit contenir au moins 8 caractères.'
    );
  });

  it('n\'envoie pas de requête si le formulaire est invalide', () => {
    fillForm('pas-un-email', 'court');
    component.submit();

    controller.expectNone(`${API}/auth/login`);
  });

  it('affiche l\'erreur renvoyée par l\'API après un callback OAuth en échec', () => {
    window.location.hash = '#provider=github&error=AUTH_OAUTH_FAILED';

    component.ngOnInit();

    expect(component.errorMessage()).toContain('La connexion avec ce fournisseur a échoué');
    // Le fragment est effacé de l'URL.
    expect(window.location.hash).toBe('');
  });

  it('ignore un fragment sans erreur', () => {
    window.location.hash = '#provider=github';

    component.ngOnInit();

    expect(component.errorMessage()).toBeNull();
  });

  it('démarre la connexion GitHub depuis le bouton dédié', () => {
    const authService = TestBed.inject(AuthService);
    const spy = jest.spyOn(authService, 'loginWithGithub').mockReturnValue(of(true));

    const button = fixture.nativeElement.querySelector(
      'button[aria-label="Continuer avec GitHub"]'
    );
    button.click();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(component.errorMessage()).toBeNull();
  });

  it('affiche un message quand le fournisseur n\'est pas disponible côté serveur', () => {
    const authService = TestBed.inject(AuthService);
    jest.spyOn(authService, 'loginWithGithub').mockReturnValue(of(false));

    component.loginWithGithub();

    expect(component.errorMessage()).toContain('GitHub');
    expect(component.errorMessage()).toContain('n’est pas disponible');
  });
});
