<<<<<<< HEAD
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JobsService } from '../../../core/services/jobs.service';
=======
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, of, switchMap } from 'rxjs';
import type { UserMe } from '@afridev/shared-types';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { CountriesService } from '../../../core/services/countries.service';
import { ApplyJobDto, JOB_CURRENCY_CODES, JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService, cvFileError } from '../../../core/services/upload.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { parseStackList, stackListValidator } from '../../../core/utils/stack-list';

export const APPLICATION_MAX_LENGTH = 5000;

/** Lien facultatif : vide, ou une adresse complète http(s):// avec un nom de domaine. */
export function optionalUrlValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  if (!value) return null;

  try {
    // L'analyse par `URL` plutôt qu'une expression régulière : pas de risque de lenteur sur une saisie longue.
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.') ? null : { url: true };
  } catch {
    return { url: true };
  }
}

/** Téléphone facultatif, mêmes caractères que l'API : chiffres, +, espaces, parenthèses, points, tirets. */
export function optionalPhoneValidator(control: AbstractControl<string>): ValidationErrors | null {
  const value = (control.value ?? '').trim();
  return !value || /^\+?[0-9 ().-]{6,20}$/.test(value) ? null : { phone: true };
}
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b

@Component({
  selector: 'app-job-apply',
  standalone: true,
<<<<<<< HEAD
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
=======
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './job-apply.component.html',
})
export class JobApplyComponent {
  private readonly jobs = inject(JobsService);
  private readonly uploads = inject(UploadService);
  private readonly users = inject(UsersService);
  private readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly maxLength = APPLICATION_MAX_LENGTH;
  readonly currencies = JOB_CURRENCY_CODES;
  readonly countries = toSignal(inject(CountriesService).list().pipe(catchError(() => of([]))), { initialValue: [] });
  readonly jobId = this.route.snapshot.paramMap.get('id');
  /** Adresse du compte, rappelée en haut du formulaire. */
  readonly email = computed(() => this.authStore.currentUser()?.email ?? '');
  private prefilledFor: string | null = null;

  readonly sending = signal(false);
  readonly uploadingCv = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly cvFile = signal<File | null>(null);
  readonly cvError = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [optionalPhoneValidator]],
    country: [''],
    city: ['', [Validators.maxLength(100)]],
    linkedinUrl: ['', [optionalUrlValidator, Validators.maxLength(200)]],
    githubUrl: ['', [optionalUrlValidator, Validators.maxLength(200)]],
    portfolioUrl: ['', [optionalUrlValidator, Validators.maxLength(200)]],
    experienceYears: this.nullableNumber([Validators.min(0), Validators.max(50)]),
    availableFrom: [''],
    expectedSalary: this.nullableNumber([Validators.min(1)]),
    expectedCurrency: ['XOF'],
    stack: ['', [stackListValidator]],
    message: ['', [Validators.required, Validators.maxLength(APPLICATION_MAX_LENGTH)]],
  });

  private nullableNumber(validators: ((control: AbstractControl<number | null>) => ValidationErrors | null)[]) {
    return new FormControl<number | null>(null, validators);
  }

  constructor() {
    // Le profil du membre n'est pas toujours chargé à l'ouverture (page ouverte directement ou rechargée) :
    // le préremplissage se fait dès qu'il arrive, une seule fois.
    effect(() => {
      const me = this.authStore.currentUser();
      if (me) untracked(() => this.prefill(me));
    });
  }

  onCvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    this.cvError.set(file ? cvFileError(file) : null);
    this.cvFile.set(file && !this.cvError() ? file : null);
    if (this.cvError()) input.value = '';
  }

  removeCv(input: HTMLInputElement): void {
    input.value = '';
    this.cvFile.set(null);
    this.cvError.set(null);
  }

  submit(): void {
    if (this.sending() || !this.jobId) return;

    const message = this.form.controls.message.value.trim();
    const fullName = this.form.controls.fullName.value.trim();
    if (!message || !fullName) {
      this.form.markAllAsTouched();
      if (!message) this.form.controls.message.setErrors({ required: true });
      if (!fullName) this.form.controls.fullName.setErrors({ required: true });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.sending.set(true);
    this.errorMessage.set(null);

    const file = this.cvFile();
    this.uploadingCv.set(!!file);

    const cvKey$: Observable<string | undefined> = file ? this.uploads.uploadCv(file) : of(undefined);
    cvKey$
      .pipe(switchMap((cvKey) => this.jobs.apply(this.jobId as string, this.buildPayload(message, fullName, cvKey))))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.uploadingCv.set(false);
          this.toast.success('Votre candidature a été envoyée. Un e-mail de confirmation vous a été adressé.');
          this.router.navigate(['/jobs', this.jobId]);
        },
        error: (error) => {
          this.sending.set(false);
          const failedUpload = this.uploadingCv();
          this.uploadingCv.set(false);
          this.errorMessage.set(
            failedUpload && !error?.status
              ? "Le CV n'a pas pu être envoyé. Réessayez ou postulez sans CV."
              : extractApiErrorMessage(error),
          );
        },
      });
  }

  /** Ne garde que les champs renseignés : l'API traite une chaîne vide comme absente, mais autant ne pas l'envoyer. */
  private buildPayload(message: string, fullName: string, cvKey: string | undefined): ApplyJobDto {
    const value = this.form.getRawValue();
    const text = (input: string) => input.trim() || undefined;
    const stack = parseStackList(value.stack);
    const salary = value.expectedSalary ?? undefined;

    return {
      message,
      fullName,
      phone: text(value.phone),
      country: text(value.country),
      city: text(value.city),
      linkedinUrl: text(value.linkedinUrl),
      githubUrl: text(value.githubUrl),
      portfolioUrl: text(value.portfolioUrl),
      experienceYears: value.experienceYears ?? undefined,
      availableFrom: text(value.availableFrom),
      expectedSalary: salary,
      expectedCurrency: salary ? value.expectedCurrency : undefined,
      stack: stack.length ? stack : undefined,
      cvKey,
    };
  }

  /** Reprend le profil du membre pour éviter de tout ressaisir ; ce qu'il a déjà tapé n'est jamais écrasé. */
  private prefill(me: UserMe): void {
    if (this.prefilledFor === me.id) return;
    this.prefilledFor = me.id;

    this.fillIfEmpty('fullName', me.displayName ?? '');

    this.users.getPublicProfile(me.username).pipe(catchError(() => of(null))).subscribe((profile) => {
      if (!profile) return;
      this.fillIfEmpty('fullName', profile.displayName ?? '');
      this.fillIfEmpty('country', profile.country ?? '');
      this.fillIfEmpty('city', profile.location ?? '');
      this.fillIfEmpty('githubUrl', profile.githubUsername ? `https://github.com/${profile.githubUsername}` : '');
      this.fillIfEmpty('linkedinUrl', profile.linkedinUsername ? `https://www.linkedin.com/in/${profile.linkedinUsername}` : '');
      this.fillIfEmpty('portfolioUrl', profile.websiteUrl ?? '');
      this.fillIfEmpty('stack', profile.stack?.join(', ') ?? '');
    });
  }

  private fillIfEmpty(name: 'fullName' | 'country' | 'city' | 'githubUrl' | 'linkedinUrl' | 'portfolioUrl' | 'stack', value: string): void {
    const control = this.form.controls[name];
    if (value && !control.value && control.pristine) control.setValue(value);
  }
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
}
