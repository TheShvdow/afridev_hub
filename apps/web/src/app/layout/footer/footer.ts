import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { LEGAL_LINKS } from '../../features/legal/legal-content';

interface FooterLink {
  label: string;
  to: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const EXPLORE: FooterColumn = {
  title: 'Explorer',
  links: [
    { label: 'Forum', to: '/forum' },
    { label: 'Projets', to: '/projets' },
    { label: 'Emplois', to: '/jobs' },
    { label: 'Mentorat', to: '/mentorat' },
    { label: 'Communautés', to: '/communautes' },
  ],
};

const CONTRIBUTE: FooterColumn = {
  title: 'Contribuer',
  links: [
    { label: 'Poser une question', to: '/forum/ask' },
    { label: 'Présenter un projet', to: '/projects/new' },
    { label: 'Publier une offre', to: '/jobs/post' },
    { label: 'Alertes emploi', to: '/jobs/alerts' },
  ],
};

const VISITOR_ACCOUNT: FooterColumn = {
  title: 'Mon compte',
  links: [
    { label: 'Se connecter', to: '/auth/login' },
    { label: 'Créer un compte', to: '/auth/register' },
    { label: 'Mot de passe oublié', to: '/auth/forgot-password' },
  ],
};

const MEMBER_ACCOUNT: FooterColumn = {
  title: 'Mon compte',
  links: [
    { label: 'Tableau de bord', to: '/tableau-de-bord' },
    { label: 'Mon profil', to: '/profile' },
    { label: 'Notifications', to: '/notifications' },
    { label: 'Mes offres', to: '/jobs/mine' },
  ],
};

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
})
export class Footer {
  readonly authStore = inject(AuthStore);
  readonly legalLinks = LEGAL_LINKS;
  readonly columns = computed(() => [EXPLORE, CONTRIBUTE, this.authStore.isAuthenticated() ? MEMBER_ACCOUNT : VISITOR_ACCOUNT]);
  readonly year = new Date().getFullYear();
}
