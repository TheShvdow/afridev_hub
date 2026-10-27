import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JOB_LIMITS, JOB_MODES, JOB_TYPES, JobMode, JobType, JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { UsersService } from '../../../core/services/users.service';
import { extractApiErrorCode, extractApiErrorMessage } from '../../../core/utils/api-error';
import { parseStackList } from '../../../core/utils/stack-list';

export const JOB_CURRENCY_CODES = ['XOF', 'XAF', 'NGN', 'GHS', 'KES', 'ZAR', 'MAD', 'EUR', 'USD'];

/** Même limite que `CreateJobDto.stack` : 1 à 5 technologies. */
function jobStackValidator(control: AbstractControl<string>): ValidationErrors | null {
  const count = parseStackList(control.value ?? '').length;
  if (count < JOB_LIMITS.stack.min) return { stackRequired: true };
  if (count > JOB_LIMITS.stack.max) return { stackTooMany: true };
  return null;
}

function salaryRangeValidator(group: AbstractControl): ValidationErrors | null {
  const min = group.get('salaryMin')?.value;
  const max = group.get('salaryMax')?.value;
  return typeof min === 'number' && typeof max === 'number' && min > max ? { salaryRange: true } : null;
}

@Component({
  selector: 'app-job-post',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './job-post.component.html',
})
export class JobPostComponent {
  private readonly jobs = inject(JobsService);
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly countries = toSignal(inject(CountriesService).list().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  readonly types = JOB_TYPES;
  readonly modes = JOB_MODES;
  readonly currencies = JOB_CURRENCY_CODES;
  readonly limits = JOB_LIMITS;

  readonly sending = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Vrai quand l'API demande d'activer le profil recruteur avant de publier. */
  readonly recruiterRequired = signal(false);
  readonly activating = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      title: ['', [Validators.required, Validators.minLength(JOB_LIMITS.title.min), Validators.maxLength(JOB_LIMITS.title.max)]],
      company: ['', [Validators.required, Validators.maxLength(JOB_LIMITS.company.max)]],
      country: ['', [Validators.required]],
      type: ['FULL_TIME' as JobType, [Validators.required]],
      mode: ['REMOTE' as JobMode, [Validators.required]],
      salaryMin: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      salaryMax: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
      currency: ['XOF', [Validators.required]],
      stack: ['', [jobStackValidator]],
      description: ['', [Validators.required, Validators.minLength(JOB_LIMITS.description.min), Validators.maxLength(JOB_LIMITS.description.max)]],
    },
    { validators: [salaryRangeValidator] },
  );

  submit(): void {
    if (this.sending()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.sending.set(true);
    this.errorMessage.set(null);
    this.recruiterRequired.set(false);

    this.jobs
      .create({
        title: value.title.trim(),
        description: value.description.trim(),
        company: value.company.trim(),
        country: value.country,
        type: value.type,
        mode: value.mode,
        salaryMin: Math.round(value.salaryMin ?? 0),
        salaryMax: Math.round(value.salaryMax ?? 0),
        currency: value.currency,
        stack: parseStackList(value.stack),
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.toast.success('Offre envoyée : elle sera publiée après validation par la modération.');
          this.router.navigateByUrl('/jobs');
        },
        error: (error) => {
          this.sending.set(false);
          this.recruiterRequired.set(extractApiErrorCode(error) === 'JOBS_RECRUITER_REQUIRED');
          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  /** Active le profil recruteur avec le nom d'entreprise saisi, puis relance la publication. */
  activateRecruiter(): void {
    const company = this.form.controls.company;
    if (this.activating() || company.invalid) {
      company.markAsTouched();
      return;
    }

    this.activating.set(true);
    this.users.enableRecruiter(company.value.trim()).subscribe({
      next: () => {
        this.activating.set(false);
        this.recruiterRequired.set(false);
        this.errorMessage.set(null);
        this.submit();
      },
      error: (error) => {
        this.activating.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
