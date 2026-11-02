import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of, switchMap, take, takeWhile, timer } from 'rxjs';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PaymentStatus, PaymentsService } from '../../core/services/payments.service';

/** Intervalle et nombre de relectures : le webhook de Bictorys arrive en quelques secondes. */
export const POLL_INTERVAL_MS = 4000;
export const POLL_MAX_ATTEMPTS = 15;

type ResultState = 'checking' | PaymentStatus | 'unknown' | 'timeout';

// Page où Bictorys ramène l'acheteur (`/payment/result?ref=<paiement>&status=success|error`).
// Le paramètre `status` vient de l'URL : il n'est jamais cru, seul le statut lu auprès de l'API fait foi.
@Component({
  selector: 'app-payment-result',
  standalone: true,
  imports: [RouterLink, PageHeroComponent],
  templateUrl: './payment-result.component.html',
})
export class PaymentResultComponent {
  private readonly payments = inject(PaymentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<ResultState>('checking');

  constructor() {
    const ref = this.route.snapshot.queryParamMap.get('ref');
    if (!ref) {
      this.state.set('unknown');
      return;
    }

    timer(0, POLL_INTERVAL_MS)
      .pipe(
        take(POLL_MAX_ATTEMPTS),
        switchMap(() => this.payments.getPayment(ref).pipe(catchError(() => of(null)))),
        takeWhile((payment) => !payment || payment.status === 'PENDING', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (payment) => {
          if (payment && payment.status !== 'PENDING') this.state.set(payment.status);
        },
        complete: () => {
          if (this.state() === 'checking') this.state.set('timeout');
        },
      });
  }
}
