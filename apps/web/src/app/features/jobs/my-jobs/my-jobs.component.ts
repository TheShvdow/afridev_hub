import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { JobsService, ApiJob, RecruiterPlan } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-my-jobs',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-jobs.component.html',
  styleUrl: './my-jobs.component.css',
})
export class MyJobsComponent implements OnInit {
  private readonly jobsService = inject(JobsService);

  readonly jobs = signal<ApiJob[]>([]);
  readonly loading = signal(false);
  readonly plan = signal<RecruiterPlan | null>(null);

  ngOnInit(): void {
    this.load();
    this.loadPlan();
  }

  load(): void {
    this.loading.set(true);
    this.jobsService.listMyJobs().subscribe({
      next: (jobs) => {
        this.jobs.set(jobs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  loadPlan(): void {
    this.jobsService.getRecruiterPlan().subscribe({
      next: (plan) => this.plan.set(plan),
      error: () => {},
    });
  }

  close(id: string): void {
    this.jobsService.closeJob(id).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  renew(id: string): void {
    this.jobsService.renewJob(id).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'Publié';
      case 'PENDING_REVIEW':
        return 'En attente de validation';
      case 'REJECTED':
        return 'Refusé';
      case 'CLOSED':
        return 'Fermé';
      case 'EXPIRED':
        return 'Expiré';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700';
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'CLOSED':
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }
}
