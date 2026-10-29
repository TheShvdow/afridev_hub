import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OnboardingComponent } from './onboarding.component';
import { CountriesService } from '../../core/services/countries.service';
import { UsersService } from '../../core/services/users.service';
import { AuthStore } from '../../core/store/auth.store';

describe('OnboardingComponent', () => {
  const users = { completeOnboarding: jest.fn() };

  function setup() {
    TestBed.configureTestingModule({
      imports: [OnboardingComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: users },
        { provide: CountriesService, useValue: { list: () => of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]) } },
        { provide: AuthStore, useValue: { currentUser: () => ({ id: 'u1' }) } },
      ],
    });
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(OnboardingComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, navigate };
  }

  beforeEach(() => {
    users.completeOnboarding.mockReset();
    localStorage.clear();
  });

  it('avance et recule entre les trois étapes', () => {
    const { component } = setup();
    component.next();
    component.next();
    component.next();
    expect(component.step()).toBe(3);
    expect(component.isLast()).toBe(true);
    component.back();
    expect(component.step()).toBe(2);
  });

  it('ajoute les technologies sans doublon et dans la limite', () => {
    const { component } = setup();
    component.stackInput.set('Angular');
    component.addTech();
    component.stackInput.set('angular');
    component.addTech();
    expect(component.stack()).toEqual(['Angular']);
    for (let i = 0; i < 15; i++) {
      component.stackInput.set(`T${i}`);
      component.addTech();
    }
    expect(component.stack().length).toBe(10);
  });

  it('envoie uniquement les champs renseignés puis quitte', () => {
    users.completeOnboarding.mockReturnValue(of({}));
    const { component, navigate } = setup();
    component.country.set('SN');
    component.selectLevel('SENIOR');
    component.finish();
    expect(users.completeOnboarding).toHaveBeenCalledWith({ country: 'SN', level: 'SENIOR' });
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('affiche une erreur et reste sur la page si l\'enregistrement échoue', () => {
    users.completeOnboarding.mockReturnValue(throwError(() => new Error('x')));
    const { component, navigate } = setup();
    component.country.set('SN');
    component.finish();
    expect(component.error()).toContain('Enregistrement impossible');
    expect(component.saving()).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('mémorise « Passer » et ne contacte pas l\'API', () => {
    const { component, navigate } = setup();
    component.skip();
    expect(users.completeOnboarding).not.toHaveBeenCalled();
    expect(localStorage.getItem('afridev_onboarding_skipped:u1')).toBe('1');
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
