import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JobsService } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-job-apply',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './job-apply.component.html',
  styleUrl: './job-apply.component.css',
})
export class JobApplyComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly jobsService = inject(JobsService);

  id = '';
  message = '';
  cvKey = '';
  loading = false;
  error = '';
  success = false;

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
  }

  submit(): void {
    if (!this.message.trim()) {
      this.error = 'Veuillez ajouter un message de motivation';
      return;
    }
    this.loading = true;
    this.error = '';
    this.jobsService
      .applyToJob(this.id, {
        message: this.message.trim(),
        cvKey: this.cvKey.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Erreur lors de la candidature';
        },
      });
  }
}
