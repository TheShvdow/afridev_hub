import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobsService } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-job-post',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './job-post.component.html',
  styleUrl: './job-post.component.css',
})
export class JobPostComponent {
  private readonly fb = inject(FormBuilder);
  private readonly jobsService = inject(JobsService);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  errorCode = '';

  form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.required]],
    company: ['', [Validators.required, Validators.maxLength(150)]],
    country: ['SN', [Validators.required]],
    type: ['FULL_TIME', [Validators.required]],
    mode: ['REMOTE', [Validators.required]],
    salaryMin: [0, [Validators.required, Validators.min(0)]],
    salaryMax: [0, [Validators.required, Validators.min(0)]],
    currency: ['XOF', [Validators.required]],
    stack: this.fb.array([this.fb.control('')]),
  });

  get stack(): FormArray<FormControl<string | null>> {
    return this.form.get('stack') as FormArray<FormControl<string | null>>;
  }
  

  addStack(): void {
    this.stack.push(this.fb.control(''));
  }

  removeStack(i: number): void {
    if (this.stack.length > 1) {
      this.stack.removeAt(i);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';

    const raw = this.form.getRawValue();
    const stack = (raw.stack || [])
      .map((s) => (s || '').trim())
      .filter(Boolean);

    const dto: any = {
      title: raw.title,
      description: raw.description,
      company: raw.company,
      country: raw.country,
      type: raw.type,
      mode: raw.mode,
      salaryMin: Number(raw.salaryMin),
      salaryMax: Number(raw.salaryMax),
      currency: raw.currency,
      stack,
    };

    this.jobsService.createJob(dto).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/jobs']);
      },
      error: (err) => {
        this.loading = false;
        this.errorCode = err?.error?.code || '';
        this.error = err?.error?.message || "Erreur lors de la soumission de l'offre";
      },
    });
  }
}
