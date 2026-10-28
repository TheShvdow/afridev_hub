import { DOCUMENT, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { JobsService, RecruiterPlan } from '../../../core/services/jobs.service';
import { PaymentProduct, PaymentsService } from '../../../core/services/payments.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-recruiter-plan',
  standalone: true,
  imports: [RouterLink, DecimalPipe, PageHeroComponent],
  templateUrl: './recruiter-plan.component.html',
})
export class RecruiterPlanComponent {
  private readonly jobs = inject(JobsService);
  private readonly payments = inject(PaymentsService);
  private readonly document = inject(DOCUMENT);

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly plan = signal<RecruiterPlan | null>(null);
  readonly product = signal<PaymentProduct | null>(null);
  readonly paying = signal(false);
  readonly payError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    forkJoin({ plan: this.jobs.getPlan(), products: this.payments.getProducts() }).subscribe({
      next: ({ plan, products }) => {
        this.plan.set(plan);
        this.product.set(products[0] ?? null);
        this.loading.set(false);
      },
      error: (error) => {
        this.loadError.set(extractApiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  /** Date de fin du premium, en français (aucune locale Angular n'est enregistrée). */
  premiumUntil(plan: RecruiterPlan): string {
    return plan.premiumUntil
      ? new Date(plan.premiumUntil).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
  }

  pay(): void {
    const product = this.product();
    if (!product || this.paying()) return;

    this.paying.set(true);
    this.payError.set(null);

    this.payments.initiate(product.code).subscribe({
      next: ({ redirectUrl }) => {
        // Seule une page de paiement en https est acceptée : jamais une adresse arbitraire renvoyée telle quelle.
        if (!RecruiterPlanComponent.isSecureUrl(redirectUrl)) {
          this.paying.set(false);
          this.payError.set('La page de paiement est indisponible pour le moment. Réessayez plus tard.');
          return;
        }
        this.goTo(redirectUrl);
      },
      error: (error) => {
        this.paying.set(false);
        this.payError.set(extractApiErrorMessage(error));
      },
    });
  }

  /** Quitte le site pour la page de paiement. */
  goTo(url: string): void {
    this.document.location.assign(url);
  }

  private static isSecureUrl(value: string): boolean {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }
}
