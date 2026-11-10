import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { JobsService } from '../../../core/services/jobs.service';

@Component({
  selector: 'app-job-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './job-edit.component.html',
  styleUrl: './job-edit.component.css',
})
export class JobEditComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly jobsService = inject(JobsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  id = '';
  loading = false;
  error = '';

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

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.jobsService.getJob(this.id).subscribe({
      next: (job: any) => {
        this.form.patchValue({
          title: job.title,
          description: job.description,
          company: job.company,
          country: job.country,
          type: job.type,
          mode: job.mode,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          currency: job.currency,
        });
        this.stack.clear();
        (job.stack || []).forEach((s: string) => this.stack.push(this.fb.control(s)));
        if (this.stack.length === 0) this.stack.push(this.fb.control(''));
      },
      error: () => {},
    });
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

    this.jobsService.updateJob(this.id, dto).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/jobs/mine']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || "Erreur lors de la mise à jour de l'offre";
      },
    });
  }
}
