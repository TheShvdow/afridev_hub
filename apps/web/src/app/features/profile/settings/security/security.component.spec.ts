import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type { UserMe } from '@afridev/shared-types';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthStore } from '../../../../core/store/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { SecurityComponent } from './security.component';

const me: UserMe = {
  id: 'u1', email: 'aminata@demo.afridev.hub', username: 'aminata_dev', displayName: null, avatarUrl: null, role: 'MEMBER',
  isVerified: true, reputation: 10, emailNotifications: true, isRecruiter: false, companyName: null,
  preferredCurrency: null, createdAt: '2026-10-01T00:00:00Z',
};

function setup(user: UserMe = me, logoutAll = jest.fn(() => of(undefined))) {
  const signOut = jest.fn();
  const navigate = jest.fn().mockResolvedValue(true);
  const toast = { success: jest.fn(), error: jest.fn() };
  TestBed.configureTestingModule({
    imports: [SecurityComponent],
    providers: [
      { provide: AuthStore, useValue: { currentUser: signal(user), signOut } },
      { provide: AuthService, useValue: { logoutAll } },
      { provide: Router, useValue: { navigateByUrl: navigate } },
      { provide: ToastService, useValue: toast },
    ],
  });
  const fixture = TestBed.createComponent(SecurityComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
  return { fixture, el, button, logoutAll, signOut, navigate, toast };
}

describe('SecurityComponent', () => {
  it('shows the address of the account and whether it is verified', () => {
    const { el } = setup();
    expect(el.textContent).toContain('aminata@demo.afridev.hub');
    expect(el.textContent).toContain('Adresse vérifiée');
  });

  it('says so when the address is not verified', () => {
    TestBed.resetTestingModule();
    expect(setup({ ...me, isVerified: false }).el.textContent).toContain('Adresse non vérifiée');
  });

  it('is honest that the password cannot be changed yet', () => {
    expect(setup().el.textContent).toContain('pas encore disponible');
  });

  it('asks for a confirmation before signing out everywhere', () => {
    const { fixture, button, logoutAll } = setup();
    button('Me déconnecter de tous les appareils').click();
    fixture.detectChanges();
    expect(logoutAll).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Déconnecter tous vos appareils ?');

    button('Annuler').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Déconnecter tous vos appareils ?');
  });

  it('signs out of every device, clears the session and goes to the login', () => {
    const { fixture, button, logoutAll, signOut, navigate, toast } = setup();
    button('Me déconnecter de tous les appareils').click();
    fixture.detectChanges();
    button('Oui, me déconnecter partout').click();

    expect(logoutAll).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/auth/login');
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows the error and keeps the session when the API refuses', () => {
    const failing = jest.fn(() => throwError(() => ({ status: 500, error: { error: { message: 'Erreur serveur' } } })));
    const { fixture, el, button, signOut } = setup(me, failing as never);
    button('Me déconnecter de tous les appareils').click();
    fixture.detectChanges();
    button('Oui, me déconnecter partout').click();
    fixture.detectChanges();

    expect(signOut).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });
});
