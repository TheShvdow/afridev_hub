<<<<<<< HEAD
import { Component, inject, OnInit, signal } from '@angular/core';
=======
import { Component } from '@angular/core';
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardJobComponent } from '../../../../shared/components/card-job.component/card-job.component';
import { JobDetailPanelComponent } from '../../../../shared/components/job-detail-panel/job-detail-panel.component';
<<<<<<< HEAD
import { JobsService, ApiJob } from '../../../../core/services/jobs.service';
=======
import { JobFiltersComponent } from '../../../../shared/components/job-filters/job-filters.component';
import { JobsBoardBase } from '../../../../shared/jobs/jobs-board.base';
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardJobComponent, JobDetailPanelComponent],
  templateUrl: './jobs.html',
})
<<<<<<< HEAD
export class Jobs implements OnInit {
  private readonly jobsService = inject(JobsService);

  readonly jobs = signal<ApiJob[]>([]);
  readonly loading = signal(false);
  readonly selectedJob = signal<any | null>(null);

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading.set(true);
    this.jobsService
      .listJobs({ page: 1, limit: 4 })
      .subscribe({
        next: (res) => {
          this.jobs.set(res.data);
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
=======
export class Jobs extends JobsBoardBase {
  protected readonly pageSize = 4;
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
}
