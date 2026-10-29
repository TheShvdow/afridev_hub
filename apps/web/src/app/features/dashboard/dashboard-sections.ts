import type { UserMe } from '@afridev/shared-types';
import type { RecruiterPlan } from '../../core/services/jobs.service';
import { profilePath } from '../../shared/utils/profile-link';

export type DashboardIcon = 'user' | 'users' | 'mail' | 'lock' | 'shield' | 'folder' | 'code' | 'briefcase' | 'check' | 'star' | 'clock' | 'calendar';

export const DASHBOARD_HOME = '/tableau-de-bord';

export interface DashboardItem {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: DashboardIcon;
  /** Pastille : un nombre à traiter ou un état (« Premium »). */
  badge?: string | null;
  /** Vrai pour une page du site (forum, offres, formulaire) : elle s'ouvre hors du tableau de bord. */
  site?: boolean;
}

export interface DashboardSection {
  id: 'activity' | 'account' | 'recruiter' | 'moderation' | 'admin';
  title: string;
  subtitle: string;
  items: DashboardItem[];
}

export interface DashboardHighlight {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

/** Ce que la page lit en plus du compte : tout peut manquer, rien ne bloque l'affichage. */
export interface DashboardContext {
  unread: number;
  plan: RecruiterPlan | null;
  pendingReports: number | null;
  pendingOffers: number | null;
}

export const isModerator = (me: UserMe): boolean => me.role === 'MODERATOR' || me.role === 'ADMIN';

/** Les facettes du compte, de la plus générale à la plus étendue. */
export function roleLabels(me: UserMe): string[] {
  const labels = ['Membre'];
  if (me.isRecruiter) labels.push('Recruteur');
  if (me.role === 'MODERATOR') labels.push('Modérateur');
  if (me.role === 'ADMIN') labels.push('Administrateur');
  return labels;
}

const count = (value: number | null, one: string): string | null =>
  value && value > 0 ? `${value} ${one}` : null;

export function planBadge(plan: RecruiterPlan | null): string | null {
  if (!plan) return null;
  if (plan.isPremium) return 'Premium';
  return plan.monthlyLimit === null ? 'Gratuit' : `${plan.offersThisMonth}/${plan.monthlyLimit} ce mois-ci`;
}

/** Chiffres clés du haut de page, adaptés au rôle. */
export function buildHighlights(me: UserMe, ctx: DashboardContext): DashboardHighlight[] {
  const highlights: DashboardHighlight[] = [
    { id: 'reputation', label: 'Réputation', value: `${me.reputation} pts`, hint: me.reputation < 10 ? 'Voter demande 10 points' : undefined },
    { id: 'unread', label: 'Notifications non lues', value: String(ctx.unread) },
  ];
  if (me.isRecruiter) {
    highlights.push({ id: 'plan', label: 'Plan recruteur', value: ctx.plan?.isPremium ? 'Premium' : 'Gratuit', hint: planBadge(ctx.plan) ?? undefined });
  }
  if (isModerator(me)) {
    const pending = (ctx.pendingReports ?? 0) + (ctx.pendingOffers ?? 0);
    highlights.push({ id: 'moderation', label: 'À modérer', value: String(pending), hint: 'signalements et offres en attente' });
  }
  return highlights;
}

/** Toutes les fonctions du site, rangées selon ce que le rôle du compte permet. */
export function buildSections(me: UserMe, ctx: DashboardContext): DashboardSection[] {
  const sections: DashboardSection[] = [
    {
      id: 'activity',
      title: 'Mon activité',
      subtitle: 'Poser une question, suivre ce qui vous concerne.',
      items: [
        { id: 'ask', title: 'Poser une question', description: 'Demandez de l\'aide à la communauté.', link: '/forum/ask', icon: 'code', site: true },
        { id: 'forum', title: 'Parcourir le forum', description: 'Questions, réponses et votes.', link: '/forum', icon: 'users', site: true },
        { id: 'notifications', title: 'Notifications', description: 'Réponses, votes, candidatures, paiements.', link: `${DASHBOARD_HOME}/notifications`, icon: 'mail', badge: ctx.unread > 0 ? String(Math.min(ctx.unread, 99)) : null },
        { id: 'alerts', title: 'Mes alertes emploi', description: 'Soyez prévenu des offres qui vous correspondent.', link: `${DASHBOARD_HOME}/alertes`, icon: 'clock' },
        { id: 'jobs', title: 'Offres d\'emploi', description: 'Parcourez et postulez avec votre CV.', link: '/jobs', icon: 'briefcase', site: true },
        // Un compte administrateur n'a pas de profil public.
        ...(profilePath(me) ? [{ id: 'public-profile', title: 'Mon profil public', description: 'Ce que les autres membres voient de vous.', link: profilePath(me) as string, icon: 'user' as const, site: true }] : []),
      ],
    },
    {
      id: 'account',
      title: 'Mon compte',
      subtitle: 'Vos informations, votre sécurité et vos préférences.',
      items: [
        { id: 'account', title: 'Informations du compte', description: 'Nom, biographie, avatar, liens.', link: `${DASHBOARD_HOME}/profil/account`, icon: 'user' },
        { id: 'security', title: 'Sécurité', description: 'Adresse vérifiée et déconnexion de tous les appareils.', link: `${DASHBOARD_HOME}/profil/security`, icon: 'lock' },
        { id: 'notification-prefs', title: 'Préférences de notifications', description: 'Choisir les e-mails que vous recevez.', link: `${DASHBOARD_HOME}/profil/notifications`, icon: 'mail' },
      ],
    },
  ];

  sections.push(
    me.isRecruiter
      ? {
          id: 'recruiter',
          title: 'Espace recruteur',
          subtitle: me.companyName ? `Offres et candidatures de ${me.companyName}.` : 'Vos offres et leurs candidatures.',
          items: [
            { id: 'my-offers', title: 'Mes offres', description: 'Statut, candidatures reçues, modification, clôture.', link: `${DASHBOARD_HOME}/offres`, icon: 'briefcase' },
            { id: 'post-offer', title: 'Publier une offre', description: 'Elle est publiée après validation par la modération.', link: '/jobs/post', icon: 'folder', site: true },
            { id: 'plan', title: 'Plan premium', description: 'Offres illimitées et profil complet des candidats.', link: `${DASHBOARD_HOME}/plan`, icon: 'star', badge: planBadge(ctx.plan) },
          ],
        }
      : {
          id: 'recruiter',
          title: 'Recruter',
          subtitle: 'Vous cherchez des talents ? Activez votre profil recruteur.',
          items: [
            { id: 'become-recruiter', title: 'Devenir recruteur', description: 'Indiquez votre entreprise et publiez votre première offre.', link: '/jobs/post', icon: 'briefcase', site: true },
          ],
        },
  );

  if (isModerator(me)) {
    sections.push({
      id: 'moderation',
      title: 'Modération',
      subtitle: 'Garder la communauté saine.',
      items: [
        { id: 'reports', title: 'Signalements', description: 'Examiner et traiter les contenus signalés.', link: `${DASHBOARD_HOME}/moderation/signalements`, icon: 'shield', badge: count(ctx.pendingReports, 'en attente') },
        { id: 'review', title: 'Offres à valider', description: 'Publier ou refuser les offres en attente.', link: `${DASHBOARD_HOME}/moderation/offres`, icon: 'check', badge: count(ctx.pendingOffers, 'en attente') },
      ],
    });
  }

  if (me.role === 'ADMIN') {
    sections.push({
      id: 'admin',
      title: 'Administration',
      subtitle: 'Suivre la plateforme et ses comptes.',
      items: [
        { id: 'indicators', title: 'Indicateurs', description: 'Les indicateurs de succès de la plateforme.', link: `${DASHBOARD_HOME}/administration/indicateurs`, icon: 'calendar' },
        { id: 'users', title: 'Utilisateurs', description: 'Rôles, bannissements, rétablissements.', link: `${DASHBOARD_HOME}/administration/utilisateurs`, icon: 'users' },
        { id: 'audit', title: 'Journal d\'audit', description: 'Les actions sensibles, une par une.', link: `${DASHBOARD_HOME}/administration/audit`, icon: 'clock' },
      ],
    });
  }

  return sections;
}
