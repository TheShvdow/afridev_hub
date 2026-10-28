import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminService, AdminStats } from '../../../core/services/admin.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

/** Indicateur de succès de la spec (SM-n) : valeur actuelle, cible, et libellé de la mesure. */
export interface Indicator {
  code: string;
  label: string;
  detail: string;
  value: number;
  target: number;
  unit: string;
  /** Vrai quand la cible exige de la dépasser strictement (SM-7 : « > 30 % »). */
  strict?: boolean;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent {
  private readonly admin = inject(AdminService);

  readonly stats = signal<AdminStats | null>(null);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  /** Indicateurs SM-2, SM-3, SM-5, SM-6 et SM-7 (SM-1 et SM-4 ne sont pas mesurés par l'API). */
  readonly indicators = computed<Indicator[]>(() => {
    const stats = this.stats();
    if (!stats) return [];

    return [
      { code: 'SM-2', label: 'Questions avec réponse', detail: 'sur les 30 derniers jours', value: stats.forum.last30Days.questionsWithAnswer, target: 100, unit: '' },
      { code: 'SM-3', label: 'Paiements réussis', detail: 'de bout en bout', value: stats.revenue.capturedPayments, target: 1, unit: '' },
      { code: 'SM-5', label: 'Offres publiées', detail: 'sur les 60 derniers jours', value: stats.jobs.publishedLast60Days, target: 10, unit: '' },
      { code: 'SM-6', label: 'Projets avec stats GitHub', detail: 'importées', value: stats.projects.withGithubStats, target: 5, unit: '' },
      { code: 'SM-7', label: 'Questions avec réponse acceptée', detail: 'sur les 30 derniers jours', value: stats.forum.last30Days.acceptedAnswerRate, target: 30, unit: ' %', strict: true },
    ];
  });

  constructor() {
    this.load();
  }

  retry(): void {
    this.load();
  }

  reached(indicator: Indicator): boolean {
    return indicator.strict ? indicator.value > indicator.target : indicator.value >= indicator.target;
  }

  /** Avancement vers la cible, plafonné à 100 %. */
  progress(indicator: Indicator): number {
    return Math.min(100, Math.round((indicator.value / indicator.target) * 100));
  }

  money(amount: number): string {
    return new Intl.NumberFormat('fr-FR').format(amount);
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.admin.stats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
