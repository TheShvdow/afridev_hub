import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import type { UserMe } from '@afridev/shared-types';
import { JobsService, RecruiterPlan } from '../../core/services/jobs.service';
import { ModerationService } from '../../core/services/moderation.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { DashboardContext, buildSections, isModerator } from './dashboard-sections';

// Les chiffres que le tableau de bord lit en plus du compte (plan, éléments à modérer) et les
// sections qui en découlent. Partagé entre la barre latérale et la vue d'ensemble : une seule lecture.
// Tout peut manquer sans empêcher l'affichage.
@Injectable({ providedIn: 'root' })
export class DashboardContextService {
  private readonly jobs = inject(JobsService);
  private readonly moderation = inject(ModerationService);
  private readonly realtime = inject(RealtimeService);

  private readonly plan = signal<RecruiterPlan | null>(null);
  private readonly pendingReports = signal<number | null>(null);
  private readonly pendingOffers = signal<number | null>(null);
  private loadedFor: string | null = null;

  readonly context = computed<DashboardContext>(() => ({
    unread: this.realtime.unreadCount(),
    plan: this.plan(),
    pendingReports: this.pendingReports(),
    pendingOffers: this.pendingOffers(),
  }));

  sections(me: UserMe) {
    return buildSections(me, this.context());
  }

  /** Lit les chiffres du compte, une seule fois par compte tant que la page reste ouverte. */
  load(me: UserMe): void {
    if (this.loadedFor === me.id) return;
    this.loadedFor = me.id;
    this.realtime.refreshUnread();

    if (me.isRecruiter) {
      this.jobs.getPlan().pipe(catchError(() => of(null))).subscribe((plan) => this.plan.set(plan));
    }
    if (isModerator(me)) {
      this.moderation.listReports('PENDING').pipe(catchError(() => of(null))).subscribe((page) => this.pendingReports.set(page?.meta.total ?? null));
      this.jobs.listPendingReview().pipe(catchError(() => of(null))).subscribe((page) => this.pendingOffers.set(page?.meta.total ?? null));
    }
  }
}
