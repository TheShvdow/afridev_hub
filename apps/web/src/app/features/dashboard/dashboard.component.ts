import { Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { Icon } from '../home/components/icon/icon';
import { AuthStore } from '../../core/store/auth.store';
import { DashboardContextService } from './dashboard-context.service';
import { buildHighlights, roleLabels } from './dashboard-sections';

// Vue d'ensemble du tableau de bord : les chiffres clés du compte et une carte par fonction, rangées
// selon le rôle. Les mêmes liens se retrouvent dans la barre latérale.
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, PageHeroComponent, Icon],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly authStore = inject(AuthStore);
  private readonly figures = inject(DashboardContextService);

  readonly me = this.authStore.currentUser;

  readonly sections = computed(() => {
    const me = this.me();
    return me ? this.figures.sections(me) : [];
  });
  readonly highlights = computed(() => {
    const me = this.me();
    return me ? buildHighlights(me, this.figures.context()) : [];
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
      if (me) untracked(() => this.figures.load(me));
    });
  }
}
