import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { ReportButtonComponent } from '../../../shared/components/report-button/report-button.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobOffer, JobsService } from '../../../core/services/jobs.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { toJob } from '../../../core/utils/job-view';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [RouterLink, PageHeroComponent, ReportButtonComponent],
  templateUrl: './job-detail.component.html',
})
export class JobDetailComponent {
  private readonly jobs = inject(JobsService);
  private readonly countries = inject(CountriesService);
  private readonly route = inject(ActivatedRoute);

  readonly offer = signal<JobOffer | null>(null);
  readonly countryNames = signal<ReadonlyMap<string, string>>(new Map());
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly loadError = signal<string | null>(null);

  readonly job = computed(() => {
    const offer = this.offer();
    return offer ? toJob(offer, this.countryNames()) : null;
  });

  private currentId: string | null = null;

  constructor() {
    this.countries
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (list) => this.countryNames.set(new Map(list.map((country) => [country.code, country.name]))),
        error: () => undefined,
      });

    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => this.load(params.get('id')));
  }

  retry(): void {
    this.load(this.currentId);
  }

  private load(id: string | null): void {
    this.currentId = id;
    this.loading.set(true);
    this.notFound.set(false);
    this.loadError.set(null);

    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.jobs.get(id).subscribe({
      next: (offer) => {
        this.offer.set(offer);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        if (error?.status === 404) {
          this.notFound.set(true);
          return;
        }
        this.loadError.set(extractApiErrorMessage(error));
      },
    });
  }
}
