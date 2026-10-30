import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { adminHomeGuard, roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { AuthStore } from '../store/auth.store';

describe('roleGuard', () => {
  const store = { currentUser: jest.fn(), accessToken: jest.fn(), setUser: jest.fn() };
  const auth = { getMe: jest.fn() };

  function run(roles: string[]) {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: store }, { provide: AuthService, useValue: auth }],
    });
    const route = { data: { roles } } as unknown as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(route, {} as never));
  }

  const forum = () => TestBed.inject(Router).createUrlTree(['/forum']).toString();

  beforeEach(() => {
    jest.resetAllMocks();
    store.accessToken.mockReturnValue('jwt');
  });

  it('lets a user with the right role in', () => {
    store.currentUser.mockReturnValue({ role: 'ADMIN' });

    expect(run(['ADMIN'])).toBe(true);
    expect(auth.getMe).not.toHaveBeenCalled();
  });

  it('sends a user with another role to the forum', () => {
    store.currentUser.mockReturnValue({ role: 'MEMBER' });

    expect((run(['ADMIN']) as UrlTree).toString()).toBe(forum());
  });

  it('waits for the profile on a direct visit instead of refusing an administrator', (done) => {
    store.currentUser.mockReturnValue(null);
    auth.getMe.mockReturnValue(of({ id: 'u1', role: 'ADMIN' }));

    (run(['MODERATOR', 'ADMIN']) as Observable<boolean | UrlTree>).subscribe((result) => {
      expect(result).toBe(true);
      expect(store.setUser).toHaveBeenCalledWith({ id: 'u1', role: 'ADMIN' });
      done();
    });
  });

  it('refuses a member once the profile is loaded', (done) => {
    store.currentUser.mockReturnValue(null);
    auth.getMe.mockReturnValue(of({ id: 'u2', role: 'MEMBER' }));

    (run(['ADMIN']) as Observable<boolean | UrlTree>).subscribe((result) => {
      expect((result as UrlTree).toString()).toBe(forum());
      done();
    });
  });

  it('sends the visitor to the forum when the profile cannot be loaded', (done) => {
    store.currentUser.mockReturnValue(null);
    auth.getMe.mockReturnValue(throwError(() => ({ status: 401 })));

    (run(['ADMIN']) as Observable<boolean | UrlTree>).subscribe((result) => {
      expect((result as UrlTree).toString()).toBe(forum());
      done();
    });
  });

  it('refuses without a token and without a profile', () => {
    store.currentUser.mockReturnValue(null);
    store.accessToken.mockReturnValue(null);

    expect((run(['ADMIN']) as UrlTree).toString()).toBe(forum());
    expect(auth.getMe).not.toHaveBeenCalled();
  });
});

describe('adminHomeGuard', () => {
  const store = { currentUser: jest.fn(), accessToken: jest.fn(), setUser: jest.fn() };
  const auth = { getMe: jest.fn() };

  function run() {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: store }, { provide: AuthService, useValue: auth }],
    });
    return TestBed.runInInjectionContext(() => adminHomeGuard({} as never, {} as never));
  }

  beforeEach(() => {
    jest.resetAllMocks();
    store.accessToken.mockReturnValue('jwt');
  });

  it('sends an administrator to the dashboard and a moderator to the reports', () => {
    store.currentUser.mockReturnValue({ role: 'ADMIN' });
    expect((run() as UrlTree).toString()).toBe('/admin/dashboard');

    TestBed.resetTestingModule();
    store.currentUser.mockReturnValue({ role: 'MODERATOR' });
    expect((run() as UrlTree).toString()).toBe('/admin/reports');
  });

  it('waits for the profile on a direct visit to /admin', (done) => {
    store.currentUser.mockReturnValue(null);
    auth.getMe.mockReturnValue(of({ id: 'u1', role: 'ADMIN' }));

    (run() as Observable<UrlTree>).subscribe((result) => {
      expect(result.toString()).toBe('/admin/dashboard');
      done();
    });
  });
});

