import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { VerificationEmail } from './verification-email';
import { envelopeInterceptor } from '../../../core/interceptors/envelope.interceptor';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';

const API = 'http://localhost:3000/api';
const EMAIL = 'mariama@example.com';

describe('VerificationEmail', () => {
  let component: VerificationEmail;
  let fixture: ReturnType<typeof TestBed.createComponent<VerificationEmail>>;
  let controller: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [VerificationEmail],
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([envelopeInterceptor, authInterceptor, errorInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VerificationEmail);
    component = fixture.componentInstance;
    controller = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);

    fixture.detectChanges();
    // La page reçoit l'email depuis `?email=…` ; on le pose directement ici.
    component.email.set(EMAIL);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    controller.verify();
  });

  it('envoie l\'email et le code à l\'API, sans jeton de session', () => {
    component.onCode('k7q2mz');
    component.submit();

    const request = controller.expectOne(`${API}/auth/verify-email`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: EMAIL, code: 'K7Q2MZ' });
    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({ data: { message: 'E-mail vérifié.' } });

    expect(component.status()).toBe('success');
    expect(component.infoMessage()).toBe('E-mail vérifié.');
  });

  it('refuse un code incomplet', () => {
    component.onCode('K7Q');
    component.submit();

    controller.expectNone(`${API}/auth/verify-email`);
    expect(component.errorMessage()).toContain('6 caractères');
  });

  it('refuse de vérifier sans adresse e-mail', () => {
    component.email.set('');

    component.onCode('K7Q2MZ');
    component.submit();

    controller.expectNone(`${API}/auth/verify-email`);
    expect(component.errorMessage()).toContain('Adresse e-mail manquante');
  });

  it('affiche le message de l\'API quand le code est invalide', () => {
    component.onCode('AAAAAA');
    component.submit();

    controller.expectOne(`${API}/auth/verify-email`).flush(
      {
        error: {
          code: 'AUTH_VERIFICATION_TOKEN_INVALID',
          message: 'Code invalide ou expiré : demandez-en un nouveau.',
        },
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toBe(
      'Code invalide ou expiré : demandez-en un nouveau.'
    );
    expect(component.status()).toBe('pending');
  });

  it('traite un compte déjà vérifié comme un succès', () => {
    component.onCode('K7Q2MZ');
    component.submit();

    controller.expectOne(`${API}/auth/verify-email`).flush(
      {
        error: {
          code: 'AUTH_ALREADY_VERIFIED',
          message: 'Cet email est déjà vérifié.',
        },
      },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.status()).toBe('success');
    expect(component.infoMessage()).toContain('déjà vérifié');
  });

  it('demande un nouveau code à l\'API', () => {
    component.resend();

    const request = controller.expectOne(`${API}/auth/resend-verification`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: EMAIL });
    request.flush({ data: { message: 'Nouveau code envoyé.' } });

    expect(component.infoMessage()).toBe('Nouveau code envoyé.');
    expect(component.resending()).toBe(false);
  });

  it('renvoie vers la connexion avec l\'email après vérification', () => {
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goLogin();

    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { email: EMAIL },
    });
  });
});
