import { Component, computed, signal } from '@angular/core';
import { CardJobComponent, Job } from '../../../shared/components/card-job.component/card-job.component';
import { JobDetailPanelComponent } from '../../../shared/components/job-detail-panel/job-detail-panel.component';
import { JobFiltersComponent } from '../../../shared/components/job-filters/job-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import {
  ALL_COUNTRIES,
  ALL_CURRENCIES,
  ALL_WORK_TYPES,
  filterJobs,
  JOB_COUNTRIES,
  JOB_CURRENCIES,
  JOB_WORK_TYPES,
  JOBS,
} from '../../../shared/data/jobs.data';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CardJobComponent, JobDetailPanelComponent, JobFiltersComponent, PageHeroComponent],
  templateUrl: './job-list.component.html',
})
export class JobListComponent {
  readonly jobs: Job[] = JOBS;

  readonly countries = JOB_COUNTRIES;
  readonly workTypes = JOB_WORK_TYPES;
  readonly currencies = JOB_CURRENCIES;

  readonly selectedCountry = signal(ALL_COUNTRIES);
  readonly selectedWorkType = signal(ALL_WORK_TYPES);
  readonly selectedCurrency = signal(ALL_CURRENCIES);

  readonly selectedJob = signal<Job | null>(null);

  readonly filteredJobs = computed(() =>
    filterJobs(this.jobs, {
      country: this.selectedCountry(),
      workType: this.selectedWorkType(),
      currency: this.selectedCurrency(),
    }),
  );

  openJob(job: Job): void {
    this.selectedJob.set(job);
  }

  closeJob(): void {
    this.selectedJob.set(null);
  }
}
