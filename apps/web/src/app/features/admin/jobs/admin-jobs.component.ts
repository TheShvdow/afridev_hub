import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PagerComponent } from '../../../shared/components/pager/pager.component';
import { JobOffer, JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { formatSalary } from '../../../core/utils/job-view';
import { relativeTime } from '../../../shared/utils/forum-thread.mapper';

/** Contrainte de `RejectJobDto.reason`. */
export const REJECTION_REASON_MIN_LENGTH = 5;

@Component({
  selector: 'app-admin-jobs',
  standalone: true,
  imports: [RouterLink, PagerComponent],
  templateUrl: './admin-jobs.component.html',
})
export class AdminJobsComponent {
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);

  readonly minReasonLength = REJECTION_REASON_MIN_LENGTH;
  readonly offers = signal<JobOffer[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  /** Offre dont le formulaire de refus est ouvert. */
  readonly rejectingId = signal<string | null>(null);
  readonly reasonError = signal<string | null>(null);

  constructor() {
    this.load();
  }

  salary(offer: JobOffer): string {
    return formatSalary(offer);
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  retry(): void {
    this.load();
  }

  approve(offer: JobOffer): void {
    if (this.busyId()) return;

    this.busyId.set(offer.id);
    this.jobs.approve(offer.id).subscribe({
      next: () => this.done('Offre publiée.'),
      error: (error) => this.fail(error),
    });
  }

  startReject(offer: JobOffer): void {
    this.reasonError.set(null);
    this.rejectingId.set(this.rejectingId() === offer.id ? null : offer.id);
  }

  reject(offer: JobOffer, reason: string): void {
    const trimmed = reason.trim();
    if (trimmed.length < REJECTION_REASON_MIN_LENGTH) {
      this.reasonError.set(`Le motif doit contenir au moins ${REJECTION_REASON_MIN_LENGTH} caractères.`);
      return;
    }
    if (this.busyId()) return;

    this.busyId.set(offer.id);
    this.jobs.reject(offer.id, trimmed).subscribe({
      next: () => this.done('Offre refusée.'),
      error: (error) => this.fail(error),
    });
  }

  private done(message: string): void {
    this.busyId.set(null);
    this.rejectingId.set(null);
    this.toast.success(message);
    this.load();
  }

  private fail(error: unknown): void {
    this.busyId.set(null);
    this.toast.error(extractApiErrorMessage(error));
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.jobs.listPendingReview(this.page()).subscribe({
      next: ({ data, meta }) => {
        this.offers.set(data);
        this.total.set(meta.total);
        this.totalPages.set(Math.max(1, meta.totalPages));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
