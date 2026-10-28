import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { CountriesService } from '../../../core/services/countries.service';
import {
  CreateJobAlertDto,
  JOB_CURRENCY_CODES,
  JOB_MODES,
  JobAlert,
  JobMode,
  JobsService,
  MAX_ALERTS,
  MAX_ALERT_STACK,
} from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { parseStackList } from '../../../core/utils/stack-list';

function alertStackValidator(control: AbstractControl<string>): ValidationErrors | null {
  const items = parseStackList(control.value ?? '');
  if (items.length > MAX_ALERT_STACK) return { stackTooMany: true };
  return items.some((item) => item.length > 30) ? { stackItemTooLong: true } : null;
}

@Component({
  selector: 'app-job-alerts',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PageHeroComponent],
  templateUrl: './job-alerts.component.html',
})
export class JobAlertsComponent {
  private readonly jobs = inject(JobsService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly maxAlerts = MAX_ALERTS;
  readonly maxStack = MAX_ALERT_STACK;
  readonly modes = JOB_MODES;
  readonly currencies = JOB_CURRENCY_CODES;

  private readonly countryList = toSignal(inject(CountriesService).list().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  readonly countries = this.countryList;
  private readonly countryNames = computed(() => new Map(this.countryList().map((country) => [country.code, country.name] as const)));

  readonly alerts = signal<JobAlert[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly confirmingId = signal<string | null>(null);

  readonly limitReached = computed(() => this.alerts().length >= MAX_ALERTS);

  readonly form = inject(FormBuilder).nonNullable.group({
    country: [this.route.snapshot.queryParamMap.get('country') ?? ''],
    mode: [(this.route.snapshot.queryParamMap.get('mode') ?? '') as JobMode | ''],
    stack: ['', [alertStackValidator]],
    salaryMin: new FormControl<number | null>(null, [Validators.min(1)]),
    currency: ['XOF'],
  });

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  countryName(code: string): string {
    return this.countryNames().get(code) ?? code;
  }

  modeLabel(mode: JobMode): string {
    return JOB_MODES.find((item) => item.value === mode)?.label ?? mode;
  }

  /** Résumé lisible des critères d'une alerte. */
  summary(alert: JobAlert): string[] {
    const parts: string[] = [];
    parts.push(alert.country ? this.countryName(alert.country) : 'Tous les pays');
    parts.push(alert.mode ? this.modeLabel(alert.mode) : 'Tous les modes');
    if (alert.stack.length) parts.push(alert.stack.join(', '));
    if (alert.salaryMin && alert.currency) {
      parts.push(`à partir de ${alert.salaryMin.toLocaleString('fr-FR')} ${alert.currency}`);
    }
    return parts;
  }

  submit(): void {
    if (this.saving() || this.limitReached()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.buildPayload();
    if (!dto.country && !dto.mode && !dto.stack && dto.salaryMin === undefined) {
      this.formError.set('Choisissez au moins un critère : pays, mode, technologies ou salaire.');
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    this.jobs.createAlert(dto).subscribe({
      next: (alert) => {
        this.saving.set(false);
        this.alerts.update((list) => [alert, ...list]);
        this.form.reset({ country: '', mode: '', stack: '', salaryMin: null, currency: 'XOF' });
        this.toast.success('Alerte créée : vous serez prévenu des nouvelles offres correspondantes.');
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(extractApiErrorMessage(error));
      },
    });
  }

  askDelete(alert: JobAlert): void {
    this.confirmingId.set(this.confirmingId() === alert.id ? null : alert.id);
  }

  confirmDelete(alert: JobAlert): void {
    if (this.deletingId()) return;

    this.deletingId.set(alert.id);
    this.jobs.deleteAlert(alert.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        this.confirmingId.set(null);
        this.alerts.update((list) => list.filter((item) => item.id !== alert.id));
        this.toast.success('Alerte supprimée.');
      },
      error: (error) => {
        this.deletingId.set(null);
        this.toast.error(extractApiErrorMessage(error));
      },
    });
  }

  /** Ne garde que les critères renseignés ; la devise n'est envoyée qu'avec un salaire. */
  private buildPayload(): CreateJobAlertDto {
    const value = this.form.getRawValue();
    const stack = parseStackList(value.stack);

    return {
      country: value.country || undefined,
      mode: value.mode || undefined,
      stack: stack.length ? stack : undefined,
      salaryMin: value.salaryMin ?? undefined,
      currency: value.salaryMin ? value.currency : undefined,
    };
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.jobs.listAlerts().subscribe({
      next: (alerts) => {
        this.alerts.set(alerts);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.loadError.set(extractApiErrorMessage(error));
      },
    });
  }
}
