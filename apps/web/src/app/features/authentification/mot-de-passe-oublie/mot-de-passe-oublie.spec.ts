import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { MotDePasseOublie } from './mot-de-passe-oublie';

function setup(query: Record<string, string> = {}, forgot = jest.fn(() => of({ message: 'ok' }))) {
  TestBed.configureTestingModule({
    imports: [MotDePasseOublie],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { forgotPassword: forgot } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(MotDePasseOublie);
  const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, navigate, forgot, el: fixture.nativeElement as HTMLElement };
}

describe('MotDePasseOublie', () => {
  it('prefills the address coming from the sign-in page', () => {
    const { component } = setup({ email: 'amadou@exemple.sn' });
    expect(component.form.controls.email.value).toBe('amadou@exemple.sn');
  });

  it('asks for a valid address before calling the API', () => {
    const { component, forgot, fixture, el } = setup();
    component.form.controls.email.setValue('pas-un-email');
    component.submit();
    fixture.detectChanges();

    expect(forgot).not.toHaveBeenCalled();
    expect(el.textContent).toContain('adresse e-mail valide');
  });

  it('asks for a code and moves on to the code step with the address', () => {
    const { component, forgot, navigate } = setup();
    component.form.controls.email.setValue(' amadou@exemple.sn ');
    component.submit();

    expect(forgot).toHaveBeenCalledWith('amadou@exemple.sn');
    expect(navigate).toHaveBeenCalledWith(['/auth/reset-password'], { queryParams: { email: 'amadou@exemple.sn' } });
  });

  it('shows the error and stays on the page when the API refuses (rate limit)', () => {
    const failing = jest.fn(() => throwError(() => ({ status: 429, error: { error: { message: 'Trop de requêtes.' } } })));
    const { component, navigate, fixture, el } = setup({}, failing as never);
    component.form.controls.email.setValue('amadou@exemple.sn');
    component.submit();
    fixture.detectChanges();

    expect(navigate).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('Trop de requêtes');
    expect(component.loading()).toBe(false);
  });

  it('does not send twice while a request is running', () => {
    const { component, forgot } = setup({}, jest.fn(() => new (jest.requireActual('rxjs').Subject)()) as never);
    component.form.controls.email.setValue('amadou@exemple.sn');
    component.submit();
    component.submit();
    expect(forgot).toHaveBeenCalledTimes(1);
  });
});
