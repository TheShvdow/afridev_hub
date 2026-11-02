import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobsService, RecruiterPlan } from '../../../core/services/jobs.service';
import { PaymentsService } from '../../../core/services/payments.service';
import { RecruiterPlanComponent } from './recruiter-plan.component';

const FREE: RecruiterPlan = { planType: 'FREE', isPremium: false, premiumUntil: null, offersThisMonth: 2, monthlyLimit: 3 };
const PREMIUM: RecruiterPlan = { planType: 'PREMIUM', isPremium: true, premiumUntil: '2026-11-27T19:45:56.746Z', offersThisMonth: 3, monthlyLimit: null };
const PRODUCT = { code: 'RECRUITER_PREMIUM_MONTHLY' as const, label: 'Plan recruteur premium — 1 mois', amount: 25000, currency: 'XOF', durationDays: 30 };

function setup(plan: RecruiterPlan, initiate = () => of({ paymentId: 'p1', amount: 25000, currency: 'XOF', redirectUrl: 'https://pay.test.bictorys.com/checkout?x=1' })) {
  const paymentsStub = { getProducts: jest.fn(() => of([PRODUCT])), initiate: jest.fn(initiate) };

  TestBed.configureTestingModule({
    imports: [RecruiterPlanComponent],
    providers: [
      provideRouter([]),
      { provide: JobsService, useValue: { getPlan: () => of(plan) } },
      { provide: PaymentsService, useValue: paymentsStub },
    ],
  });
  const fixture = TestBed.createComponent(RecruiterPlanComponent);
  const assign = jest.spyOn(fixture.componentInstance, 'goTo').mockImplementation();
  fixture.detectChanges();
  return { fixture, assign, paymentsStub, el: fixture.nativeElement as HTMLElement };
}

const payButton = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('button')).find((b) => b.textContent?.includes('Passer en premium')) as HTMLButtonElement | undefined;

describe('RecruiterPlanComponent', () => {
  it('offers the premium plan with its server price to a free recruiter', () => {
    const { el } = setup(FREE);
    expect(el.textContent).toContain('2 offres sur 3');
    expect(el.textContent).toContain('25,000');
    expect(payButton(el)).toBeDefined();
  });

  it('redirects to the Bictorys checkout page after initiating the payment', () => {
    const { el, assign, paymentsStub } = setup(FREE);
    payButton(el)!.click();
    expect(paymentsStub.initiate).toHaveBeenCalledWith('RECRUITER_PREMIUM_MONTHLY');
    expect(assign).toHaveBeenCalledWith('https://pay.test.bictorys.com/checkout?x=1');
  });

  it('never redirects to a page that is not https', () => {
    const { fixture, el, assign } = setup(FREE, () => of({ paymentId: 'p1', amount: 1, currency: 'XOF', redirectUrl: 'javascript:alert(1)' }));
    payButton(el)!.click();
    fixture.detectChanges();
    expect(assign).not.toHaveBeenCalled();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('indisponible');
  });

  it('shows the API error when the payment cannot start', () => {
    const { fixture, el } = setup(FREE, () => throwError(() => ({ status: 403, error: { error: { code: 'PAYMENTS_RECRUITER_REQUIRED', message: 'Activez votre profil recruteur.' } } })));
    payButton(el)!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('profil recruteur');
    expect(payButton(el)!.disabled).toBe(false);
  });

  it('shows the premium end date and no payment button once premium', () => {
    const { el } = setup(PREMIUM);
    expect(el.textContent).toContain('Plan premium actif');
    expect(el.textContent).toContain('27 novembre 2026');
    expect(payButton(el)).toBeUndefined();
  });
});
