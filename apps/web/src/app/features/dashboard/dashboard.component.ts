import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { Icon } from '../home/components/icon/icon';
import { AuthStore } from '../../core/store/auth.store';
import { JobsService } from '../../core/services/jobs.service';
import { ModerationService } from '../../core/services/moderation.service';
import { RealtimeService } from '../../core/services/realtime.service';
import {
  DashboardContext,
  buildHighlights,
  buildSections,
  isModerator,
  roleLabels,
} from './dashboard-sections';

// Point d'entrée de tout ce que le compte peut faire : chaque fonction du site y a sa carte, rangée
// selon le rôle. Les chiffres (plan, éléments à modérer) sont lus en plus ; s'ils manquent, la page
// s'affiche quand même.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, PageHeroComponent, Icon],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);
  private readonly jobs = inject(JobsService);
  private readonly moderation = inject(ModerationService);
  private readonly realtime = inject(RealtimeService);

  readonly me = this.authStore.currentUser;
  private readonly plan = signal<DashboardContext['plan']>(null);
  private readonly pendingReports = signal<number | null>(null);
  private readonly pendingOffers = signal<number | null>(null);

  private readonly context = computed<DashboardContext>(() => ({
    unread: this.realtime.unreadCount(),
    plan: this.plan(),
    pendingReports: this.pendingReports(),
    pendingOffers: this.pendingOffers(),
  }));

  readonly sections = computed(() => {
    const me = this.me();
    return me ? buildSections(me, this.context()) : [];
  });
  readonly highlights = computed(() => {
    const me = this.me();
    return me ? buildHighlights(me, this.context()) : [];
  });
  readonly roles = computed(() => {
    const me = this.me();
    return me ? roleLabels(me) : [];
  });
  readonly greeting = computed(() => {
    const me = this.me();
    return me ? `Bonjour ${me.displayName ?? me.username}` : 'Tableau de bord';
  });

  constructor() {
    // Le profil se charge après l'ouverture de la page : les chiffres se lisent quand il arrive.
    effect(() => {
      const me = this.me();
      if (me) untracked(() => this.loadFigures(me.isRecruiter, isModerator(me)));
    });
  }

  private loadFigures(recruiter: boolean, moderator: boolean): void {
    this.realtime.refreshUnread();

    if (recruiter) {
      this.jobs.getPlan().pipe(catchError(() => of(null))).subscribe((plan) => this.plan.set(plan));
    }
    if (moderator) {
      this.moderation.listReports('PENDING').pipe(catchError(() => of(null))).subscribe((page) => this.pendingReports.set(page?.meta.total ?? null));
      this.jobs.listPendingReview().pipe(catchError(() => of(null))).subscribe((page) => this.pendingOffers.set(page?.meta.total ?? null));
    }
  }
}
