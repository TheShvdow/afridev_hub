import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobsService, JobAlert } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-job-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './job-alerts.component.html',
  styleUrl: './job-alerts.component.css',
})
export class JobAlertsComponent implements OnInit {
  private readonly jobsService = inject(JobsService);

  readonly alerts = signal<JobAlert[]>([]);
  readonly loading = signal(false);
  showForm = false;
  country = '';
  mode = '';
  stack = '';
  salaryMin: number | null = null;
  currency = 'XOF';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.jobsService.listJobAlerts().subscribe({
      next: (alerts) => {
        this.alerts.set(alerts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  create(): void {
    const stackArr = this.stack
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    this.jobsService
      .createJobAlert({
        country: this.country || undefined,
        mode: this.mode || undefined,
        stack: stackArr.length ? stackArr : undefined,
        salaryMin: this.salaryMin ?? undefined,
        currency: this.currency || undefined,
      })
      .subscribe({
        next: () => {
          this.showForm = false;
          this.country = '';
          this.mode = '';
          this.stack = '';
          this.salaryMin = null;
          this.load();
        },
        error: () => {},
      });
  }

  delete(id: string): void {
    this.jobsService.deleteJobAlert(id).subscribe({
      next: () => this.load(),
      error: () => {},
    });
  }
}
