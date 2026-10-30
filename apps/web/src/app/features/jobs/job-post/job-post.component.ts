<<<<<<< HEAD
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { JobsService } from '../../../core/services/jobs.service';
=======
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JOB_CURRENCY_CODES, JOB_LIMITS, JOB_MODES, JOB_TYPES, JobMode, JobType, JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStore } from '../../../core/store/auth.store';
import { UsersService } from '../../../core/services/users.service';
import { extractApiErrorCode, extractApiErrorMessage } from '../../../core/utils/api-error';
import { parseStackList } from '../../../core/utils/stack-list';

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
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b

@Component({
  selector: 'app-job-post',
  standalone: true,
<<<<<<< HEAD
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
=======
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './job-post.component.html',
})
export class JobPostComponent {
  private readonly jobs = inject(JobsService);
  private readonly users = inject(UsersService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authStore = inject(AuthStore);

  readonly countries = toSignal(inject(CountriesService).list().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  readonly types = JOB_TYPES;
  readonly modes = JOB_MODES;
  readonly currencies = JOB_CURRENCY_CODES;
  readonly limits = JOB_LIMITS;

  /** Identifiant de l'offre en cours de modification ; absent pour une nouvelle offre. */
  readonly editId = this.route.snapshot.paramMap.get('id');
  readonly editing = this.editId !== null;
  readonly loadingOffer = signal(this.editing);
  /** `notFound` ou `forbidden` quand l'offre à modifier ne peut pas l'être. */
  readonly offerProblem = signal<'notFound' | 'forbidden' | 'error' | null>(null);
  readonly offerStatus = signal<string | null>(null);

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

  constructor() {
    if (this.editId) this.loadOffer(this.editId);
  }

  private loadOffer(id: string): void {
    this.jobs.get(id).subscribe({
      next: (offer) => {
        const me = this.authStore.currentUser();
        if (me && offer.recruiter.id !== me.id) {
          this.offerProblem.set('forbidden');
          this.loadingOffer.set(false);
          return;
        }

        this.offerStatus.set(offer.status);
        this.form.patchValue({
          title: offer.title,
          company: offer.company,
          country: offer.country,
          type: offer.type,
          mode: offer.mode,
          salaryMin: offer.salaryMin,
          salaryMax: offer.salaryMax,
          currency: offer.currency,
          stack: offer.stack.join(', '),
          description: offer.description ?? '',
        });
        this.loadingOffer.set(false);
      },
      error: (error) => {
        this.offerProblem.set(error?.status === 404 ? 'notFound' : 'error');
        this.loadingOffer.set(false);
      },
    });
  }

  submit(): void {
    if (this.sending() || this.loadingOffer()) return;

>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
<<<<<<< HEAD
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
=======

    const value = this.form.getRawValue();
    this.sending.set(true);
    this.errorMessage.set(null);
    this.recruiterRequired.set(false);

    const payload = {
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
    };

    const request = this.editId ? this.jobs.update(this.editId, payload) : this.jobs.create(payload);
    const wasRejected = this.offerStatus() === 'REJECTED';

    request.subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success(this.successMessage(wasRejected));
        this.router.navigateByUrl('/jobs/mine');
      },
      error: (error) => {
        this.sending.set(false);
        this.recruiterRequired.set(!this.editId && extractApiErrorCode(error) === 'JOBS_RECRUITER_REQUIRED');
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }

  private successMessage(wasRejected: boolean): string {
    if (!this.editId) return 'Offre envoyée : elle sera publiée après validation par la modération.';
    return wasRejected ? 'Offre corrigée : elle repart en validation par la modération.' : 'Offre mise à jour.';
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
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
      },
    });
  }
}
