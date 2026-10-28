import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { AuthStore } from '../../core/store/auth.store';
import { envelopeInterceptor } from '../../core/interceptors/envelope.interceptor';
import { authInterceptor } from '../../core/interceptors/auth.interceptor';
import type { UserMe } from '@afridev/shared-types';

const user: UserMe = {
  id: 'user-1',
  email: 'idrissa@example.com',
  username: 'idrissa_wade',
  displayName: null,
  avatarUrl: null,
  role: 'MEMBER',
  isVerified: false,
  reputation: 0,
  emailNotifications: true,
  isRecruiter: false,
  companyName: null,
  preferredCurrency: null,
  createdAt: '2026-10-20T16:53:59.632Z',
};

describe('Navbar', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<Navbar>>;
  let store: InstanceType<typeof AuthStore>;
  let controller: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([envelopeInterceptor, authInterceptor])
        ),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    store = TestBed.inject(AuthStore);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    controller.verify();
  });

  it('affiche le bouton Rejoindre vers la connexion quand on est déconnecté', () => {
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[routerlink="/auth/login"]');

    expect(link).toBeTruthy();
    expect(link.textContent).toContain('Rejoindre');
    expect(fixture.nativeElement.querySelector('button[aria-label="Menu du compte"]')).toBeNull();
  });

  it('remplace le bouton Rejoindre par l\'icône du compte quand on est connecté', () => {
    store.setTokens('at-1', 'rt-1');
    store.setUser(user);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[routerlink="/auth/login"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('button[aria-label="Menu du compte"]')).toBeTruthy();
  });

  it('ouvre le menu du compte au clic sur l\'icône', () => {
    store.setTokens('at-1', 'rt-1');
    store.setUser(user);

    fixture.detectChanges();

    fixture.nativeElement
      .querySelector('button[aria-label="Menu du compte"]')
      .click();
    controller
      .expectOne((req) => req.url.endsWith('/notifications/unread-count'))
      .flush({ data: { count: 3 } });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('idrissa_wade');
    expect(text).toContain('Mon profil');
    expect(text).toContain('Notifications');
    expect(text).toContain('3');
    expect(text).toContain('Déconnexion');
  });

  it('propose « Mes offres » aux recruteurs seulement', () => {
    store.setTokens('at-1', 'rt-1');
    store.setUser({ ...user, isRecruiter: true });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Menu du compte"]').click();
    controller
      .expectOne((req) => req.url.endsWith('/notifications/unread-count'))
      .flush({ data: { count: 0 } });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Mes offres');
  });

  it('déconnecte et ferme le menu au clic sur « Déconnexion »', () => {
    store.setTokens('at-1', 'rt-1');
    store.setUser(user);

    fixture.detectChanges();
    fixture.nativeElement
      .querySelector('button[aria-label="Menu du compte"]')
      .click();
    controller
      .expectOne((req) => req.url.endsWith('/notifications/unread-count'))
      .flush({ data: { count: 0 } });
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button')
    ) as HTMLButtonElement[];
    const logout = buttons.find((button) => button.textContent?.includes('Déconnexion'));

    logout?.click();
    fixture.detectChanges();

    // L'API est informée de la révocation du refresh token.
    const request = controller.expectOne((req) => req.url.endsWith('/auth/logout'));
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(store.isAuthenticated()).toBe(false);
    expect(fixture.nativeElement.querySelector('a[routerlink="/auth/login"]')).toBeTruthy();
  });
});
