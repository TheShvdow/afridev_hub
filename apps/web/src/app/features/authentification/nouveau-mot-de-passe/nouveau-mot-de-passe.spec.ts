import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { NouveauMotDePasse } from './nouveau-mot-de-passe';

const OK = { message: 'ok' };

function setup(query: Record<string, string> = { email: 'amadou@exemple.sn' }, overrides: { reset?: jest.Mock; forgot?: jest.Mock } = {}) {
  const reset = overrides.reset ?? jest.fn(() => of(OK));
  const forgot = overrides.forgot ?? jest.fn(() => of(OK));
  TestBed.configureTestingModule({
    imports: [NouveauMotDePasse],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { resetPassword: reset, forgotPassword: forgot } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(NouveauMotDePasse);
  const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  const component = fixture.componentInstance;
  const fill = (code = 'K7Q2MZ', password = 'Valide123', confirm = password) => {
    component.onCode(code);
    component.form.setValue({ password, confirm });
  };
  return { fixture, component, reset, forgot, navigate, fill, el: fixture.nativeElement as HTMLElement };
}

describe('NouveauMotDePasse', () => {
  it('shows the address the code was sent to', () => {
    expect(setup().el.textContent).toContain('amadou@exemple.sn');
  });

  it('sends the address, the upper-case code and the new password', () => {
    const { component, reset, fill } = setup();
    fill('k7q2mz', 'Valide123');
    component.submit();
    expect(reset).toHaveBeenCalledWith('amadou@exemple.sn', 'K7Q2MZ', 'Valide123');
  });

  it('shows the success step, which closes every device and leads to the sign-in', () => {
    const { component, fill, fixture, el, navigate } = setup();
    fill();
    component.submit();
    fixture.detectChanges();

    expect(component.status()).toBe('success');
    expect(el.textContent).toContain('Mot de passe modifié');
    expect(el.textContent).toContain('déconnectés');

    component.goLogin();
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], { queryParams: { email: 'amadou@exemple.sn' } });
  });

  it('asks for the 6 characters of the code first', () => {
    const { component, reset, fixture, el, fill } = setup();
    fill('K7Q');
    component.submit();
    fixture.detectChanges();

    expect(reset).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('6 caractères');
  });

  it.each(['court1A', 'toutenminuscule1', 'SansChiffreIci'])('refuses the weak password %s', (password) => {
    const { component, reset, fill } = setup();
    fill('K7Q2MZ', password);
    component.submit();
    expect(reset).not.toHaveBeenCalled();
    expect(component.form.controls.password.errors?.['passwordRules']).toBeTruthy();
  });

  it('refuses a confirmation that differs', () => {
    const { component, reset, fill, fixture } = setup();
    fill('K7Q2MZ', 'Valide123', 'Autre1234');
    component.submit();
    fixture.detectChanges();
    expect(reset).not.toHaveBeenCalled();
    expect(component.form.hasError('mismatch')).toBe(true);
  });

  it('shows the API error for a wrong or expired code and stays on the step', () => {
    const failing = jest.fn(() => throwError(() => ({ status: 400, error: { error: { message: 'Code invalide ou expiré : demandez-en un nouveau.' } } })));
    const { component, fill, fixture, el } = setup(undefined, { reset: failing });
    fill();
    component.submit();
    fixture.detectChanges();

    expect(component.status()).toBe('pending');
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Code invalide ou expiré');
    expect(component.loading()).toBe(false);
  });

  it('sends a new code on request and says so without revealing anything', () => {
    const { component, forgot, fixture, el } = setup();
    component.resend();
    fixture.detectChanges();

    expect(forgot).toHaveBeenCalledWith('amadou@exemple.sn');
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Si ton compte existe');
  });

  it('sends the member back to ask for a code when the address is missing', () => {
    const { component, reset, fill, fixture, el } = setup({});
    fill();
    component.submit();
    fixture.detectChanges();

    expect(reset).not.toHaveBeenCalled();
    expect(el.querySelector('a[href="/auth/forgot-password"]')).toBeTruthy();
  });
});
