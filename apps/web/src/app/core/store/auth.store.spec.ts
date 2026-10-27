import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthStore } from './auth.store';
import { envelopeInterceptor } from '../interceptors/envelope.interceptor';
import { authInterceptor } from '../interceptors/auth.interceptor';
import type { UserMe } from '@afridev/shared-types';

const ACCESS_TOKEN_KEY  = 'afridev_at';
const REFRESH_TOKEN_KEY = 'afridev_rt';

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

describe('AuthStore', () => {
  let store: InstanceType<typeof AuthStore>;
  let controller: HttpTestingController;

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

    store = TestBed.inject(AuthStore);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    localStorage.clear();
    controller.verify();
  });

  it('expose l\'état initial déconnecté', () => {
    expect(store.accessToken()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('persist et applique les tokens à la connexion', () => {
    store.setTokens('at-1', 'rt-1');

    expect(store.accessToken()).toBe('at-1');
    expect(store.refreshToken()).toBe('rt-1');
    expect(store.isAuthenticated()).toBe(true);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('at-1');
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('rt-1');
  });

  it('rehydrate les tokens depuis le stockage local et charge le profil', () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, 'at-1');
    localStorage.setItem(REFRESH_TOKEN_KEY, 'rt-1');

    store.initializeAuth();

    expect(store.accessToken()).toBe('at-1');
    expect(store.refreshToken()).toBe('rt-1');

    const request = controller.expectOne((req) => req.url.endsWith('/auth/me'));
    expect(request.request.headers.get('Authorization')).toBe('Bearer at-1');
    request.flush({ data: user });

    expect(store.currentUser()).toEqual(user);
  });

  it('efface les tokens et l\'état à la déconnexion', () => {
    store.setTokens('at-1', 'rt-1');
    store.setUser(user);

    store.logout();

    expect(store.accessToken()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(store.currentUser()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });
});
