import type { UserMe } from '@afridev/shared-types';
import type { RecruiterPlan } from '../../core/services/jobs.service';
import { DashboardContext, buildHighlights, buildSections, planBadge, roleLabels } from './dashboard-sections';

const member: UserMe = {
  id: 'u1', email: 'a@x.io', username: 'aminata_dev', displayName: 'Aminata', avatarUrl: null, role: 'MEMBER',
  isVerified: true, reputation: 215, emailNotifications: true, isRecruiter: false, companyName: null,
  preferredCurrency: null, createdAt: '2026-10-01T00:00:00Z',
};
const recruiter: UserMe = { ...member, isRecruiter: true, companyName: 'Wave Mobile Money' };
const moderator: UserMe = { ...member, role: 'MODERATOR' };
const admin: UserMe = { ...member, role: 'ADMIN' };

const nothing: DashboardContext = { unread: 0, plan: null, pendingReports: null, pendingOffers: null };
const free: RecruiterPlan = { planType: 'FREE', isPremium: false, premiumUntil: null, offersThisMonth: 2, monthlyLimit: 3 };
const premium: RecruiterPlan = { planType: 'PREMIUM', isPremium: true, premiumUntil: '2026-11-27T00:00:00Z', offersThisMonth: 4, monthlyLimit: null };

const ids = (me: UserMe, ctx = nothing) => buildSections(me, ctx).map((section) => section.id);
const links = (me: UserMe, ctx = nothing) => buildSections(me, ctx).flatMap((section) => section.items.map((item) => item.link));

describe('dashboard sections', () => {
  it('gives a simple member the activity, account and recruiting sections only', () => {
    expect(ids(member)).toEqual(['activity', 'account', 'recruiter']);
    expect(links(member)).not.toContain('/tableau-de-bord/moderation/signalements');
    expect(links(member)).not.toContain('/tableau-de-bord/administration/utilisateurs');
  });

  it('opens every feature that used to need its address typed by hand', () => {
    const all = [...links({ ...admin, isRecruiter: true }), '/@aminata_dev'];
    for (const link of ['/forum/ask', '/tableau-de-bord/alertes', '/tableau-de-bord/plan', '/jobs/post', '/tableau-de-bord/offres', '/tableau-de-bord/profil/security', '/tableau-de-bord/profil/notifications', '/@aminata_dev', '/tableau-de-bord/moderation/signalements', '/tableau-de-bord/moderation/offres', '/tableau-de-bord/administration/indicateurs', '/tableau-de-bord/administration/utilisateurs', '/tableau-de-bord/administration/audit']) {
      expect(all).toContain(link);
    }
    expect(links(recruiter)).toEqual(expect.arrayContaining(['/tableau-de-bord/offres', '/jobs/post', '/tableau-de-bord/plan']));
  });

  it('gives an administrator no public profile card, and everyone else one', () => {
    expect(links(admin)).not.toContain('/@aminata_dev');
    expect(links(member)).toContain('/@aminata_dev');
    expect(links(moderator)).toContain('/@aminata_dev');
  });

  it('offers a non-recruiter to become one instead of the recruiter tools', () => {
    const recruiting = buildSections(member, nothing).find((section) => section.id === 'recruiter')!;
    expect(recruiting.items.map((item) => item.id)).toEqual(['become-recruiter']);
    expect(links(member)).not.toContain('/tableau-de-bord/offres');
  });

  it('gives a recruiter the recruiter tools, with the company name', () => {
    const recruiting = buildSections(recruiter, nothing).find((section) => section.id === 'recruiter')!;
    expect(recruiting.items.map((item) => item.id)).toEqual(['my-offers', 'post-offer', 'plan']);
    expect(recruiting.subtitle).toContain('Wave Mobile Money');
  });

  it('adds moderation for a moderator, and administration for an administrator only', () => {
    expect(ids(moderator)).toEqual(['activity', 'account', 'recruiter', 'moderation']);
    expect(links(moderator)).not.toContain('/tableau-de-bord/administration/utilisateurs');
    expect(ids(admin)).toEqual(['activity', 'account', 'recruiter', 'moderation', 'admin']);
  });

  it('puts the number to handle on the card: unread notifications and pending moderation', () => {
    const ctx: DashboardContext = { unread: 150, plan: premium, pendingReports: 4, pendingOffers: 0 };
    const sections = buildSections(admin, ctx);
    const item = (id: string) => sections.flatMap((section) => section.items).find((entry) => entry.id === id)!;

    expect(item('notifications').badge).toBe('99');
    expect(item('reports').badge).toBe('4 en attente');
    expect(item('review').badge).toBeNull();
    expect(buildSections(member, nothing).flatMap((s) => s.items).find((i) => i.id === 'notifications')!.badge).toBeNull();
  });

  it('names the plan on the plan card', () => {
    expect(planBadge(null)).toBeNull();
    expect(planBadge(free)).toBe('2/3 ce mois-ci');
    expect(planBadge(premium)).toBe('Premium');
  });

  it('lists the facets of the account', () => {
    expect(roleLabels(member)).toEqual(['Membre']);
    expect(roleLabels({ ...admin, isRecruiter: true })).toEqual(['Membre', 'Recruteur', 'Administrateur']);
  });

  it('shows figures that fit the role', () => {
    expect(buildHighlights(member, nothing).map((h) => h.id)).toEqual(['reputation', 'unread']);
    expect(buildHighlights(recruiter, { ...nothing, plan: free }).map((h) => h.id)).toEqual(['reputation', 'unread', 'plan']);
    const mod = buildHighlights(moderator, { ...nothing, pendingReports: 2, pendingOffers: 3 });
    expect(mod.find((h) => h.id === 'moderation')?.value).toBe('5');
  });

  it('reminds a low-reputation member why voting is locked', () => {
    expect(buildHighlights({ ...member, reputation: 4 }, nothing)[0].hint).toContain('10 points');
    expect(buildHighlights(member, nothing)[0].hint).toBeUndefined();
  });
});
