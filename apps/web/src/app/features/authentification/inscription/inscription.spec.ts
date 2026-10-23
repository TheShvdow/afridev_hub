import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Inscription } from './inscription';
import { envelopeInterceptor } from '../../../core/interceptors/envelope.interceptor';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { errorInterceptor } from '../../../core/interceptors/error.interceptor';
import { AuthStore } from '../../../core/store/auth.store';
import { AuthService } from '../../../core/services/auth.service';

const API = 'http://localhost:3000/api';

describe('Inscription', () => {
  let component: Inscription;
  let fixture: ReturnType<typeof TestBed.createComponent<Inscription>>;
  let controller: HttpTestingController;
  let router: Router;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Inscription],
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([envelopeInterceptor, authInterceptor, errorInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inscription);
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

  function fillForm(): void {
    component.form.setValue({
      username: 'mariama_kone',
      email: 'mariama@example.com',
      speciality: 'Développement web',
      password: 'MotDePasse123!',
    });
  }

  it('crée le compte avec les seuls champs acceptés par l\'API et ouvre la vérification', () => {
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fillForm();
    component.submit();

    const request = controller.expectOne(`${API}/auth/register`);
    expect(request.request.method).toBe('POST');
    // `RegisterDto` n'accepte que username, email et password : la spécialité
    // est conservée côté front pour être écrite dans le profil après connexion.
    expect(request.request.body).toEqual({
      username: 'mariama_kone',
      email: 'mariama@example.com',
      password: 'MotDePasse123!',
    });

    request.flush({
      data: {
        message: 'Compte créé : saisissez le code reçu par email pour l\'activer.',
        email: 'mariama@example.com',
      },
    });

    // L'inscription n'ouvre pas de session : aucun token, aucun appel protégé.
    expect(store.accessToken()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(sessionStorage.getItem('afridev_pending_speciality')).toBe('Développement web');

    expect(navigate).toHaveBeenCalledWith(['/auth/verify-email'], {
      queryParams: { email: 'mariama@example.com' },
    });
  });

  it('affiche le message de l\'API quand l\'e-mail est déjà utilisé', () => {
    fillForm();
    component.submit();

    controller.expectOne(`${API}/auth/register`).flush(
      {
        error: {
          code: 'AUTH_EMAIL_TAKEN',
          message: 'Cet e-mail est déjà utilisé.',
        },
      },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.errorMessage()).toBe('Cet e-mail est déjà utilisé.');
    expect(component.loading()).toBe(false);
    expect(store.accessToken()).toBeNull();
  });

  it('n\'envoie pas de requête si le formulaire est invalide', () => {
    component.form.setValue({
      username: 'a',
      email: 'pas-un-email',
      speciality: '',
      password: 'court',
    });

    component.submit();

    controller.expectNone(`${API}/auth/register`);
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
