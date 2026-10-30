import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsService, ApiJob } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-admin-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-jobs.component.html',
  styleUrl: './admin-jobs.component.css',
})
export class AdminJobsComponent implements OnInit {
  private readonly jobsService = inject(JobsService);

  readonly jobs = signal<ApiJob[]>([]);
  readonly loading = signal(false);
  readonly meta = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  rejectReason = '';
  rejectingId: string | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobsService.listJobsForReview(this.meta().page, this.meta().limit).subscribe({
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

  approve(id: string): void {
    this.jobsService.approveJob(id).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }

  startReject(id: string): void {
    this.rejectingId = id;
    this.rejectReason = '';
  }

  cancelReject(): void {
    this.rejectingId = null;
    this.rejectReason = '';
  }

  confirmReject(id: string): void {
    if (!this.rejectReason.trim()) return;
    this.jobsService.rejectJob(id, this.rejectReason.trim()).subscribe({
      next: () => {
        this.cancelReject();
        this.load();
      },
      error: () => {},
    });
  }
}
