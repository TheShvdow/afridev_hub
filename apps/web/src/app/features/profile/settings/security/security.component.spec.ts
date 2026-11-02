import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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

function setup(user: UserMe = me, logoutAll = jest.fn(() => of(undefined)), changePassword = jest.fn(() => of({ accessToken: 'at-2', refreshToken: 'rt-2' }))) {
  const signOut = jest.fn();
  const setTokens = jest.fn();
  const toast = { success: jest.fn(), error: jest.fn() };
  TestBed.configureTestingModule({
    imports: [SecurityComponent],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { currentUser: signal(user), signOut, setTokens } },
      { provide: AuthService, useValue: { logoutAll, changePassword } },
      { provide: ToastService, useValue: toast },
    ],
  });
  const fixture = TestBed.createComponent(SecurityComponent);
  const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const button = (label: string) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes(label)) as HTMLButtonElement;
  const fillPassword = (current = 'AncienMdp1', next = 'NouveauMdp1', confirm = next) =>
    fixture.componentInstance.passwordForm.setValue({ currentPassword: current, newPassword: next, confirm });
  return { fixture, el, button, logoutAll, signOut, navigate, toast, changePassword, setTokens, fillPassword };
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

  describe('changement de mot de passe', () => {
    it('no longer says the password cannot be changed', () => {
      const { el } = setup();
      expect(el.textContent).not.toContain('pas encore disponible');
      expect(el.querySelector('form')).toBeTruthy();
    });

    it('changes it, stores the new tokens of this device and empties the form', () => {
      const { fixture, changePassword, setTokens, toast, fillPassword } = setup();
      fillPassword();
      fixture.componentInstance.changePassword();

      expect(changePassword).toHaveBeenCalledWith('AncienMdp1', 'NouveauMdp1');
      expect(setTokens).toHaveBeenCalledWith('at-2', 'rt-2', expect.any(Boolean));
      expect(toast.success).toHaveBeenCalled();
      expect(fixture.componentInstance.passwordForm.getRawValue().newPassword).toBe('');
    });

    it('keeps the session in the same storage: remembered when the refresh token is in localStorage', () => {
      localStorage.setItem('afridev_rt', 'old');
      const { fixture, setTokens, fillPassword } = setup();
      fillPassword();
      fixture.componentInstance.changePassword();
      expect(setTokens).toHaveBeenCalledWith('at-2', 'rt-2', true);
      localStorage.clear();

      TestBed.resetTestingModule();
      const second = setup();
      second.fillPassword();
      second.fixture.componentInstance.changePassword();
      expect(second.setTokens).toHaveBeenCalledWith('at-2', 'rt-2', false);
    });

    it.each([['court1A'], ['toutenminuscule1'], ['SansChiffreIci']])('refuses the weak new password %s', (weak) => {
      const { fixture, changePassword, fillPassword } = setup();
      fillPassword('AncienMdp1', weak);
      fixture.componentInstance.changePassword();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it('refuses a confirmation that differs', () => {
      const { fixture, changePassword, fillPassword } = setup();
      fillPassword('AncienMdp1', 'NouveauMdp1', 'Autre1234');
      fixture.componentInstance.changePassword();
      expect(changePassword).not.toHaveBeenCalled();
    });

    it('shows the API error, e.g. a wrong current password, and keeps the tokens', () => {
      const failing = jest.fn(() => throwError(() => ({ status: 400, error: { error: { code: 'AUTH_CURRENT_PASSWORD_INVALID', message: 'Le mot de passe actuel est incorrect.' } } })));
      const { fixture, el, setTokens, fillPassword } = setup(me, undefined, failing as never);
      fillPassword();
      fixture.componentInstance.changePassword();
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"]')?.textContent).toContain('actuel est incorrect');
      expect(setTokens).not.toHaveBeenCalled();
      expect(fixture.componentInstance.changing()).toBe(false);
    });

    it('offers a GitHub or Google account to define a password', () => {
      const failing = jest.fn(() => throwError(() => ({ status: 400, error: { error: { code: 'AUTH_NO_PASSWORD', message: 'Ce compte se connecte avec GitHub ou Google.' } } })));
      const { fixture, el, fillPassword } = setup(me, undefined, failing as never);
      fillPassword();
      fixture.componentInstance.changePassword();
      fixture.detectChanges();

      expect(el.querySelector('[role="alert"] a[href="/auth/forgot-password"]')).toBeTruthy();
    });
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
