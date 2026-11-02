import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobStatus, JobsService, MyJobOffer, ReceivedApplication, RecruiterPlan } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { formatSalary } from '../../../core/utils/job-view';
import { relativeTime } from '../../../shared/utils/forum-thread.mapper';
import { hasPublicProfile, profilePath } from '../../../shared/utils/profile-link';

export const STATUS_LABELS: Record<JobStatus, string> = {
  PENDING_REVIEW: 'En attente de validation',
  ACTIVE: 'En ligne',
  REJECTED: 'Refusée',
  EXPIRED: 'Expirée',
  CLOSED: 'Clôturée',
};

const STATUS_STYLES: Record<JobStatus, string> = {
  PENDING_REVIEW: 'bg-[#FEFCE8] text-[#A16207]',
  ACTIVE: 'bg-[#F0FDF4] text-[#0F6932]',
  REJECTED: 'bg-[#FB2C36]/10 text-[#FB2C36]',
  EXPIRED: 'bg-[#F1F5F9] text-[#64748B]',
  CLOSED: 'bg-[#F1F5F9] text-[#64748B]',
};

@Component({
  selector: 'app-my-jobs',
  standalone: true,
  imports: [RouterLink, PageHeroComponent],
  templateUrl: './my-jobs.component.html',
})
export class MyJobsComponent {
  readonly profilePath = profilePath;
  readonly hasPublicProfile = hasPublicProfile;
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);

  private readonly countryList = toSignal(inject(CountriesService).list().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  private readonly countryNames = computed(() => new Map(this.countryList().map((country) => [country.code, country.name] as const)));

  readonly offers = signal<MyJobOffer[]>([]);
  readonly plan = signal<RecruiterPlan | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  /** Offre dont l'on confirme la clôture. */
  readonly closingId = signal<string | null>(null);

  /** Offre dont les candidatures sont ouvertes, et leur chargement. */
  readonly openApplicationsId = signal<string | null>(null);
  readonly applications = signal<ReceivedApplication[]>([]);
  readonly loadingApplications = signal(false);
  readonly applicationsError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  statusLabel(offer: MyJobOffer): string {
    return STATUS_LABELS[offer.status as JobStatus] ?? offer.status;
  }

  statusClass(offer: MyJobOffer): string {
    return STATUS_STYLES[offer.status as JobStatus] ?? 'bg-[#F1F5F9] text-[#64748B]';
  }

  /** Une offre clôturée ne se modifie plus. */
  canEdit(offer: MyJobOffer): boolean {
    return offer.status !== 'CLOSED';
  }

  canRenew(offer: MyJobOffer): boolean {
    return offer.status === 'ACTIVE' || offer.status === 'EXPIRED';
  }

  canClose(offer: MyJobOffer): boolean {
    return offer.status === 'ACTIVE' || offer.status === 'PENDING_REVIEW';
  }

  salary(offer: MyJobOffer): string {
    return formatSalary(offer);
  }

  date(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }

  countryName(code: string | null | undefined): string {
    return code ? (this.countryNames().get(code) ?? code) : '';
  }

  quotaText(plan: RecruiterPlan): string {
    if (plan.isPremium) return 'Plan premium : offres illimitées.';
    return `${plan.offersThisMonth} offre${plan.offersThisMonth > 1 ? 's' : ''} sur ${plan.monthlyLimit} ce mois-ci (plan gratuit).`;
  }

  quotaReached(plan: RecruiterPlan): boolean {
    return plan.monthlyLimit !== null && plan.offersThisMonth >= plan.monthlyLimit;
  }

  renew(offer: MyJobOffer): void {
    this.act(offer, this.jobs.renew(offer.id), 'Offre renouvelée pour 60 jours.');
  }

  askClose(offer: MyJobOffer): void {
    this.closingId.set(this.closingId() === offer.id ? null : offer.id);
  }

  confirmClose(offer: MyJobOffer): void {
    this.act(offer, this.jobs.close(offer.id), 'Offre clôturée.');
  }

  toggleApplications(offer: MyJobOffer): void {
    if (this.openApplicationsId() === offer.id) {
      this.openApplicationsId.set(null);
      return;
    }

    this.openApplicationsId.set(offer.id);
    this.applications.set([]);
    this.applicationsError.set(null);
    this.loadingApplications.set(true);

    this.jobs.listApplications(offer.id).subscribe({
      next: (applications) => {
        if (this.openApplicationsId() !== offer.id) return;
        this.applications.set(applications);
        this.loadingApplications.set(false);
      },
      error: (error) => {
        if (this.openApplicationsId() !== offer.id) return;
        this.loadingApplications.set(false);
        this.applicationsError.set(extractApiErrorMessage(error));
      },
    });
  }

  applicantName(application: ReceivedApplication): string {
    return application.fullName ?? application.user.displayName ?? application.user.username;
  }

  private act(offer: MyJobOffer, request: ReturnType<JobsService['close']>, success: string): void {
    if (this.busyId()) return;

    this.busyId.set(offer.id);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.closingId.set(null);
        this.toast.success(success);
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractApiErrorMessage(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.jobs.getPlan().pipe(catchError(() => of(null))).subscribe((plan) => this.plan.set(plan));
    this.jobs.listMine().subscribe({
      next: (offers) => {
        this.offers.set(offers);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
