import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { OauthCallback } from './oauth-callback';
import { AuthService } from '../../../core/services/auth.service';
import type { UserMe } from '@afridev/shared-types';

const baseUser = {
  id: 'user-oauth',
  email: 'dev@example.com',
  username: 'dev_github',
  displayName: null,
  avatarUrl: null,
  role: 'MEMBER',
  isVerified: true,
  reputation: 0,
  emailNotifications: true,
  isRecruiter: false,
  companyName: null,
  preferredCurrency: null,
  createdAt: '2026-11-15T10:00:00.000Z',
  country: null,
  level: null,
  stack: [],
} as unknown as UserMe;

describe('OauthCallback', () => {
  const getMe = jest.fn();

  async function run(user: UserMe) {
    getMe.mockReturnValue(of(user));
    window.location.hash = '#at=access-token&rt=refresh-token';

    await TestBed.configureTestingModule({
      imports: [OauthCallback],
      providers: [provideRouter([]), { provide: AuthService, useValue: { getMe } }],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const navigateByUrl = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    TestBed.createComponent(OauthCallback).detectChanges();
    return { navigate, navigateByUrl };
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    getMe.mockReset();
  });

  it('envoie un profil vide vers les écrans de bienvenue', async () => {
    const { navigate, navigateByUrl } = await run(baseUser);

    expect(navigate).toHaveBeenCalledWith(['/bienvenue'], { queryParams: { returnUrl: '/' } });
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('');
  });

  it('envoie un profil déjà rempli vers l’accueil', async () => {
    const { navigate, navigateByUrl } = await run({ ...baseUser, country: 'SN' } as UserMe);

    expect(navigateByUrl).toHaveBeenCalledWith('/');
    expect(navigate).not.toHaveBeenCalled();
  });
});
