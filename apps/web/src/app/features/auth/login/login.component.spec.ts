import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { envelopeInterceptor } from '../../../core/interceptors/envelope.interceptor';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { AuthStore } from '../../../core/store/auth.store';

const API = 'http://localhost:3000/api';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ReturnType<typeof TestBed.createComponent<LoginComponent>>;
  let controller: HttpTestingController;
  let router: Router;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([envelopeInterceptor, authInterceptor, errorInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    store = TestBed.inject(AuthStore);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  function fillForm(email = 'idrissa@example.com', password = 'MotDePasse123!'): void {
    component.form.setValue({ email, password });
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
});
