import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardJobComponent } from '../../../../shared/components/card-job.component/card-job.component';
import { JobDetailPanelComponent } from '../../../../shared/components/job-detail-panel/job-detail-panel.component';
import { JobsService, ApiJob } from '../../../../core/services/jobs.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardJobComponent, JobDetailPanelComponent],
  templateUrl: './jobs.html',
  styleUrl: './jobs.css',
})
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
}
