import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import type { UserMe } from '@afridev/shared-types';
import { AuthStore } from '../../../../core/store/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { UsersService } from '../../../../core/services/users.service';
import { NotificationPrefsComponent } from './notification-prefs.component';

const me: UserMe = {
  id: 'u1', email: 'a@x.io', username: 'aminata_dev', displayName: null, avatarUrl: null, role: 'MEMBER',
  isVerified: true, reputation: 10, emailNotifications: true, isRecruiter: false, companyName: null,
  preferredCurrency: null, createdAt: '2026-10-01T00:00:00Z',
};

function setup(update = jest.fn(() => of({}))) {
  const currentUser = signal<UserMe | null>(me);
  const setUser = jest.fn((user: UserMe | null) => currentUser.set(user));
  const toast = { success: jest.fn(), error: jest.fn() };
  TestBed.configureTestingModule({
    imports: [NotificationPrefsComponent],
    providers: [
      { provide: AuthStore, useValue: { currentUser, setUser } },
      { provide: UsersService, useValue: { updateProfile: update } },
      { provide: ToastService, useValue: toast },
    ],
  });
  const fixture = TestBed.createComponent(NotificationPrefsComponent);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const toggle = () => el.querySelector('button[role="switch"]') as HTMLButtonElement;
  return { fixture, el, toggle, update, setUser, toast, currentUser };
}

describe('NotificationPrefsComponent', () => {
  it('shows the switch on when e-mails are on, and says what always stays on', () => {
    const { el, toggle } = setup();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(el.textContent).toContain('E-mails d\'activité');
    expect(el.textContent).toContain('reçu de paiement');
  });

  it('saves the new choice at once and updates the account in the store', () => {
    const { fixture, toggle, update, setUser, toast } = setup();
    toggle().click();
    fixture.detectChanges();

    expect(update).toHaveBeenCalledWith({ emailNotifications: false });
    expect(setUser).toHaveBeenCalledWith({ ...me, emailNotifications: false });
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(toast.success).toHaveBeenCalled();
  });

  it('puts the switch back and shows the error when the API refuses', () => {
    const failing = jest.fn(() => throwError(() => ({ status: 500, error: { error: { message: 'Erreur serveur' } } })));
    const { fixture, el, toggle, setUser } = setup(failing as never);
    toggle().click();
    fixture.detectChanges();

    expect(setUser).toHaveBeenLastCalledWith(me);
    expect(toggle().getAttribute('aria-checked')).toBe('true');
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(toggle().disabled).toBe(false);
  });
});
