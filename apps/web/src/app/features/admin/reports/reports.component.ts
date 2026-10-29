import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PagerComponent } from '../../../shared/components/pager/pager.component';
import {
  AdminReport,
  ModerationService,
  REPORT_RESOLUTIONS,
  REPORT_STATUSES,
  ReportResolution,
  ReportStatus,
} from '../../../core/services/moderation.service';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { relativeTime } from '../../../shared/utils/forum-thread.mapper';

const OPEN_STATUSES: ReportStatus[] = ['PENDING', 'REVIEWED'];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [RouterLink, PagerComponent],
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  private readonly moderation = inject(ModerationService);
  private readonly toast = inject(ToastService);

  readonly statuses = REPORT_STATUSES;
  readonly resolutions = REPORT_RESOLUTIONS;

  readonly status = signal<ReportStatus>('PENDING');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly reports = signal<AdminReport[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  /** Signalement en cours de traitement, pour bloquer ses boutons. */
  readonly busyId = signal<string | null>(null);

  private readonly notes = new Map<string, string>();
  private readonly chosen = new Map<string, ReportResolution>();

  constructor() {
    this.load();
  }

  selectStatus(status: string): void {
    this.status.set(status as ReportStatus);
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  isOpen(report: AdminReport): boolean {
    return OPEN_STATUSES.includes(report.status);
  }

  /** Motif lisible : la partie avant « : », la précision éventuelle après. */
  reasonOf(report: AdminReport): { code: string; details: string | null } {
    const [code, ...rest] = report.reason.split(' : ');
    return { code, details: rest.length ? rest.join(' : ') : null };
  }

  reasonLabel(code: string): string {
    const labels: Record<string, string> = {
      SPAM: 'Spam ou publicité',
      OFFENSIVE: 'Contenu offensant',
      OFF_TOPIC: 'Hors sujet',
      DUPLICATE: 'Doublon',
      OTHER: 'Autre',
    };
    return labels[code] ?? code;
  }

  /** Lien vers le contenu signalé : la question (la question parente pour une réponse), le projet ou l'offre. */
  contentLink(report: AdminReport): { commands: string[]; label: string } | null {
    const target = report.target;
    if (!target) return null;
    if (target.postId) {
      return { commands: ['/forum', target.postId], label: report.entityType === 'ANSWER' ? 'Voir la réponse dans sa question' : 'Voir la question' };
    }
    if (target.slug) return { commands: ['/projects', target.slug], label: 'Voir le projet' };
    if (target.jobId) return { commands: ['/jobs', target.jobId], label: 'Voir l\'offre' };
    return null;
  }

  entityLabel(type: AdminReport['entityType']): string {
    const labels: Record<AdminReport['entityType'], string> = { POST: 'Question', ANSWER: 'Réponse', PROJECT: 'Projet', JOB: 'Offre' };
    return labels[type] ?? type;
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }

  setNote(id: string, value: string): void {
    this.notes.set(id, value);
  }

  setResolution(id: string, value: string): void {
    this.chosen.set(id, value as ReportResolution);
  }

  resolve(report: AdminReport): void {
    const action = this.chosen.get(report.id) ?? 'HIDDEN';
    this.act(report, this.moderation.resolveReport(report.id, action, this.notes.get(report.id)?.trim() || undefined), 'Signalement traité.');
  }

  dismiss(report: AdminReport): void {
    this.act(report, this.moderation.dismissReport(report.id, this.notes.get(report.id)?.trim() || undefined), 'Signalement ignoré.');
  }

  retry(): void {
    this.load();
  }

  private act(report: AdminReport, request: ReturnType<ModerationService['dismissReport']>, success: string): void {
    if (this.busyId()) return;

    this.busyId.set(report.id);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.toast.success(success);
        this.load();
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractApiErrorMessage(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.moderation.listReports(this.status(), this.page()).subscribe({
      next: ({ data, meta }) => {
        this.reports.set(data);
        this.total.set(meta.total);
        this.totalPages.set(Math.max(1, meta.totalPages));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
