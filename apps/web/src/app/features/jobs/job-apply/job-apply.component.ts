import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

export const APPLICATION_MAX_LENGTH = 5000;

@Component({
  selector: 'app-job-apply',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './job-apply.component.html',
})
export class JobApplyComponent {
  private readonly jobs = inject(JobsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly maxLength = APPLICATION_MAX_LENGTH;
  readonly jobId = this.route.snapshot.paramMap.get('id');
  readonly sending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    message: ['', [Validators.required, Validators.maxLength(APPLICATION_MAX_LENGTH)]],
  });

  submit(): void {
    if (this.sending() || !this.jobId) return;

    const message = this.form.controls.message.value.trim();
    if (!message) {
      this.form.markAllAsTouched();
      this.form.controls.message.setErrors({ required: true });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    this.jobs.apply(this.jobId, { message }).subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success('Votre candidature a été envoyée. Un e-mail de confirmation vous a été adressé.');
        this.router.navigate(['/jobs', this.jobId]);
      },
      error: (error) => {
        this.sending.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
