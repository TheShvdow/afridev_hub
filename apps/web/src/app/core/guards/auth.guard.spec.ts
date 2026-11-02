import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthStore } from '../store/auth.store';
import { authGuard } from './auth.guard';

function run(authenticated: boolean, url: string) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthStore, useValue: { isAuthenticated: () => authenticated } },
      { provide: Router, useValue: { createUrlTree: jest.fn((commands, extras) => ({ commands, extras })) } },
    ],
  });
  const state = { url } as RouterStateSnapshot;
  return TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state)) as unknown;
}

describe('authGuard', () => {
  it('lets a signed-in member through', () => {
    expect(run(true, '/notifications')).toBe(true);
  });

  it('sends a visitor to the login with the page they asked for, even on the very first navigation', () => {
    expect(run(false, '/jobs/plan')).toEqual({
      commands: ['/auth/login'],
      extras: { queryParams: { returnUrl: '/jobs/plan' } },
    });
  });
});
