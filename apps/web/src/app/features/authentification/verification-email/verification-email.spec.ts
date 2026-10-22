import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VerificationEmail } from './verification-email';
import { envelopeInterceptor } from '../../../core/interceptors/envelope.interceptor';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { AuthStore } from '../../../core/store/auth.store';

const API = 'http://localhost:3000/api';

describe('VerificationEmail', () => {
  let component: VerificationEmail;
  let fixture: ReturnType<typeof TestBed.createComponent<VerificationEmail>>;
  let controller: HttpTestingController;
  let store: InstanceType<typeof AuthStore>;

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
    store = TestBed.inject(AuthStore);

    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    controller.verify();
  });

  it('envoie le code reçu par e-mail à l\'API', () => {
    store.setTokens('at-1', 'rt-1');

    component.onCode('k7q2mz');
    component.submit();

    const request = controller.expectOne(`${API}/auth/verify-email`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ code: 'K7Q2MZ' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer at-1');

    request.flush({ data: { message: 'E-mail vérifié.' } });

    expect(component.status()).toBe('success');
    expect(component.infoMessage()).toBe('E-mail vérifié.');

    // Le profil est rafraîchi pour refléter `isVerified`.
    controller.expectOne((req) => req.url.endsWith('/auth/me')).flush({ data: {} });
  });

  it('refuse un code incomplet', () => {
    component.onCode('K7Q');
    component.submit();

    controller.expectNone(`${API}/auth/verify-email`);
    expect(component.errorMessage()).toContain('6 caractères');
  });

  it('affiche le message de l\'API quand le code est invalide', () => {
    store.setTokens('at-1', 'rt-1');

    component.onCode('AAAAAA');
    component.submit();

    controller.expectOne(`${API}/auth/verify-email`).flush(
      {
        error: {
          code: 'AUTH_VERIFICATION_CODE_INVALID',
          message: 'Code de vérification invalide.',
        },
      },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.errorMessage()).toBe('Code de vérification invalide.');
    expect(component.status()).toBe('pending');
  });

  it('demande un nouveau code à l\'API', () => {
    store.setTokens('at-1', 'rt-1');

    component.resend();

    const request = controller.expectOne(`${API}/auth/resend-verification`);
    expect(request.request.method).toBe('POST');
    request.flush({ data: { message: 'Nouveau code envoyé.' } });

    expect(component.infoMessage()).toBe('Nouveau code envoyé.');
    expect(component.resending()).toBe(false);
  });
});
