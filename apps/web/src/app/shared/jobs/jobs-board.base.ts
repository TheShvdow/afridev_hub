import { Directive, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { Job } from '../components/card-job.component/card-job.component';
import { CountriesService } from '../../core/services/countries.service';
import { JOB_MODES, JobOffer, JobsService, ListJobsQuery } from '../../core/services/jobs.service';
import { extractApiErrorMessage } from '../../core/utils/api-error';
import { toJob } from '../../core/utils/job-view';

export const ALL_COUNTRIES = 'Tous les pays';
export const ALL_WORK_TYPES = 'Tous';
export const ALL_CURRENCIES = 'Tout';

/** Devises d'affichage proposées : l'API convertit les salaires dans la devise choisie. */
export const JOB_CURRENCIES = [ALL_CURRENCIES, 'XOF', 'EUR', 'USD'];
export const JOB_WORK_TYPES = [ALL_WORK_TYPES, ...JOB_MODES.map((mode) => mode.label)];

// Liste des offres filtrée par pays, mode et devise, chargée depuis l'API.
// Partagé par la page des offres et la section de l'accueil.
@Directive()
export abstract class JobsBoardBase {
  private readonly jobsApi = inject(JobsService);
  private readonly countriesApi = inject(CountriesService);

  protected abstract readonly pageSize: number;

  readonly workTypes = JOB_WORK_TYPES;
  readonly currencies = JOB_CURRENCIES;

  private readonly countryList = toSignal(
    this.countriesApi.list().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );
  private readonly countryNames = computed(
    () => new Map(this.countryList().map((country) => [country.code, country.name] as const)),
  );
  readonly countries = computed(() => [ALL_COUNTRIES, ...this.countryList().map((country) => country.name)]);

  readonly selectedCountry = signal(ALL_COUNTRIES);
  readonly selectedWorkType = signal(ALL_WORK_TYPES);
  readonly selectedCurrency = signal(ALL_CURRENCIES);

  private readonly offers = signal<JobOffer[]>([]);
  readonly jobs = computed<Job[]>(() => this.offers().map((offer) => toJob(offer, this.countryNames())));

  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly selectedJob = signal<Job | null>(null);

  private readonly query = computed<ListJobsQuery>(() => {
    const country = this.countryList().find((item) => item.name === this.selectedCountry());
    const mode = JOB_MODES.find((item) => item.label === this.selectedWorkType());
    const currency = this.selectedCurrency();

    return {
      limit: this.pageSize,
      country: country?.code,
      mode: mode?.value,
      currency: currency === ALL_CURRENCIES ? undefined : currency,
    };
  }, { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) });

  private page = 1;
  private requestId = 0;

  constructor() {
    // Chaque changement de filtre repart de la première page.
    effect(() => {
      const query = this.query();
      untracked(() => this.fetch(query, 1));
    });
  }

  retry(): void {
    this.fetch(this.query(), 1);
  }

  loadMore(): void {
    if (this.loading() || this.loadingMore() || !this.hasMore()) return;
    this.fetch(this.query(), this.page + 1);
  }

  openJob(job: Job): void {
    this.selectedJob.set(job);
  }

  closeJob(): void {
    this.selectedJob.set(null);
  }

  private fetch(query: ListJobsQuery, page: number): void {
    const requestId = ++this.requestId;
    const append = page > 1;

    (append ? this.loadingMore : this.loading).set(true);
    this.loadError.set(null);

    this.jobsApi.list({ ...query, page }).subscribe({
      next: ({ data, meta }) => {
        if (requestId !== this.requestId) return;
        this.page = page;
        this.offers.update((current) => (append ? [...current, ...data] : data));
        this.hasMore.set(meta.page < meta.totalPages);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: (error) => {
        if (requestId !== this.requestId) return;
        this.loading.set(false);
        this.loadingMore.set(false);
        this.loadError.set(extractApiErrorMessage(error));
      },
    });
  }
}
