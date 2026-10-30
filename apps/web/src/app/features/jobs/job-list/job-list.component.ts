import { Component, inject, OnInit, signal } from '@angular/core';
import { CardJobComponent } from '../../../shared/components/card-job.component/card-job.component';
import { JobDetailPanelComponent } from '../../../shared/components/job-detail-panel/job-detail-panel.component';
import { JobFiltersComponent } from '../../../shared/components/job-filters/job-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { RouterLink } from '@angular/router';
import { JobsService, ApiJob } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [RouterLink, CardJobComponent, JobDetailPanelComponent, JobFiltersComponent, PageHeroComponent],
  templateUrl: './job-list.component.html',
  styleUrl: './job-list.component.css',
})
export class JobListComponent implements OnInit {
  private readonly jobsService = inject(JobsService);

  readonly jobs = signal<ApiJob[]>([]);
  readonly loading = signal(false);
  readonly meta = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });

  readonly countries = ['Tous les pays', 'SN', 'FR', 'NG', 'MA', 'CI', 'GH', 'KE'];
  readonly workTypes = ['Tous les types', 'FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP'];
  readonly currencies = ['Tous', 'XOF', 'EUR', 'USD', 'NGN'];

  readonly selectedCountry = signal('Tous les pays');
  readonly selectedWorkType = signal('Tous les types');
  readonly selectedCurrency = signal('Tous');

  readonly selectedJob = signal<any | null>(null);

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading.set(true);
    this.jobsService
      .listJobs({
        page: this.meta().page,
        limit: this.meta().limit,
        country: this.selectedCountry() !== 'Tous les pays' ? this.selectedCountry() : undefined,
        type: this.selectedWorkType() !== 'Tous les types' ? (this.selectedWorkType() as any) : undefined,
        currency: this.selectedCurrency() !== 'Tous' ? this.selectedCurrency() : undefined,
      })
      .subscribe({
        next: (res) => {
          this.jobs.set(res.data);
          this.meta.set(res.meta);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  openJob(job: ApiJob): void {
    this.selectedJob.set(job);
    this.jobsService.getJob(job.id).subscribe({
      next: (detail) => {
        this.selectedJob.set({ ...job, ...detail });
      },
      error: () => {},
    });
  }

  closeJob(): void {
    this.selectedJob.set(null);
  }
}
