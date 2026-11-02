import { TestBed, fakeAsync, tick, discardPeriodicTasks } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Payment, PaymentsService } from '../../core/services/payments.service';
import { POLL_INTERVAL_MS, POLL_MAX_ATTEMPTS, PaymentResultComponent } from './payment-result.component';

function setup(query: Record<string, string>, statuses: Array<Payment['status']>) {
  let call = 0;
  const getPayment = jest.fn(() => of({ id: 'p1', status: statuses[Math.min(call++, statuses.length - 1)], amount: 25000, currency: 'XOF' }));

  TestBed.configureTestingModule({
    imports: [PaymentResultComponent],
    providers: [
      provideRouter([]),
      { provide: PaymentsService, useValue: { getPayment } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
    ],
  });
  const fixture = TestBed.createComponent(PaymentResultComponent);
  fixture.detectChanges();
  return { fixture, getPayment, el: fixture.nativeElement as HTMLElement };
}

describe('PaymentResultComponent', () => {
  it('confirms the payment once the API reports it captured', fakeAsync(() => {
    const { fixture, el, getPayment } = setup({ ref: 'p1', status: 'success' }, ['PENDING', 'CAPTURED']);
    tick(0);
    tick(POLL_INTERVAL_MS);
    fixture.detectChanges();
    expect(getPayment).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain('Paiement confirmé');
    discardPeriodicTasks();
  }));

  it('does not trust the status in the URL', fakeAsync(() => {
    const { fixture, el } = setup({ ref: 'p1', status: 'success' }, ['FAILED']);
    tick(0);
    fixture.detectChanges();
    expect(el.textContent).toContain('Paiement refusé');
    expect(el.textContent).not.toContain('Paiement confirmé');
    discardPeriodicTasks();
  }));

  it('stops waiting after the maximum number of attempts', fakeAsync(() => {
    const { fixture, el, getPayment } = setup({ ref: 'p1' }, ['PENDING']);
    tick(POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS);
    fixture.detectChanges();
    expect(getPayment).toHaveBeenCalledTimes(POLL_MAX_ATTEMPTS);
    expect(el.textContent).toContain('en cours de confirmation');
  }));

  it('explains that there is nothing to show without a payment reference', () => {
    const { el, getPayment } = setup({}, ['PENDING']);
    expect(getPayment).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Aucun paiement à afficher');
  });
});
