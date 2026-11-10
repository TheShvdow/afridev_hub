import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Navbar } from './navbar';
import { AuthStore } from '../../core/store/auth.store';
import { RealtimeService } from '../../core/services/realtime.service';
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
  const realtime = { unreadCount: signal(0), refreshUnread: jest.fn() };
  let fixture: ReturnType<typeof TestBed.createComponent<Navbar>>;
  let store: InstanceType<typeof AuthStore>;
  let controller: HttpTestingController;

  beforeEach(async () => {
    realtime.unreadCount.set(0);
    realtime.refreshUnread.mockClear();
    localStorage.clear();
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        provideRouter([]),
        { provide: RealtimeService, useValue: realtime },
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

  it('ouvre le menu mobile sous la barre : liens listés dans le panneau, barre arrondie à angles moyens', () => {
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('nav') as HTMLElement;
    const toggle = fixture.nativeElement.querySelector('button[aria-label="Ouvrir le menu"]') as HTMLButtonElement;
    expect(nav.classList).not.toContain('navbar--open');
    expect(nav.querySelector('.mobile-menu')?.classList).not.toContain('mobile-menu--open');

    toggle.click();
    fixture.detectChanges();

    // Le panneau est dans la colonne de la barre, sinon il se placerait à côté du logo.
    expect(nav.classList).toContain('flex-col');
    expect(nav.classList).toContain('navbar--open');
    expect(nav.querySelector('.mobile-menu')?.classList).toContain('mobile-menu--open');
    expect(nav.querySelectorAll('.mobile-menu__list li a').length).toBeGreaterThanOrEqual(5);
    expect(fixture.nativeElement.querySelector('button[aria-label="Fermer le menu"]')).toBeTruthy();
  });

  it('anime le panneau mobile via les classes d’état (ouverture stylée)', () => {
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('.mobile-menu') as HTMLElement;
    const items = fixture.nativeElement.querySelectorAll('.mobile-menu__item');

    expect(menu).toBeTruthy();
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(menu.classList.contains('mobile-menu--open')).toBe(false);

    fixture.nativeElement.querySelector('button[aria-label="Ouvrir le menu"]').click();
    fixture.detectChanges();

    expect(menu.classList.contains('mobile-menu--open')).toBe(true);
    expect((items[0] as HTMLElement).style.getPropertyValue('--i')).toBe('0');
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
    realtime.unreadCount.set(3);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('idrissa_wade');
    expect(text).toContain('Tableau de bord');
    expect(fixture.nativeElement.querySelector('a[routerlink="/tableau-de-bord"]')).toBeTruthy();
    expect(text).toContain('Mon profil');
    expect(text).toContain('Notifications');
    expect(text).toContain('3');
    expect(text).toContain('Déconnexion');
  });

  it('propose le tableau de bord dans le menu mobile aux membres connectés seulement', () => {
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Ouvrir le menu"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav ul li a[routerlink="/tableau-de-bord"]')).toBeNull();

    store.setTokens('at-1', 'rt-1');
    store.setUser(user);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('nav ul li a[routerlink="/tableau-de-bord"]')).toBeTruthy();
  });

  it('propose « Mes offres » aux recruteurs seulement', () => {
    store.setTokens('at-1', 'rt-1');
    store.setUser({ ...user, isRecruiter: true });
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button[aria-label="Menu du compte"]').click();
    realtime.unreadCount.set(0);
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
    realtime.unreadCount.set(0);
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
