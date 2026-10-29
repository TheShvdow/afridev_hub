import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import type { UserMe } from '@afridev/shared-types';
import { AuthStore } from '../../core/store/auth.store';
import { JobsService } from '../../core/services/jobs.service';
import { ModerationService } from '../../core/services/moderation.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { DashboardComponent } from './dashboard.component';

const base: UserMe = {
  id: 'u1', email: 'a@x.io', username: 'aminata_dev', displayName: 'Aminata Diallo', avatarUrl: null, role: 'MEMBER',
  isVerified: false, reputation: 215, emailNotifications: true, isRecruiter: false, companyName: null,
  preferredCurrency: null, createdAt: '2026-10-01T00:00:00Z',
};
const page = (total: number) => of({ data: [], meta: { total, page: 1, limit: 20, totalPages: 1 } });

function setup(user: UserMe | null, overrides: { plan?: unknown; reports?: unknown; review?: unknown } = {}) {
  const currentUser = signal<UserMe | null>(user);
  const jobs = {
    getPlan: jest.fn(() => (overrides.plan ?? of({ planType: 'FREE', isPremium: false, premiumUntil: null, offersThisMonth: 1, monthlyLimit: 3 }))),
    listPendingReview: jest.fn(() => (overrides.review ?? page(2))),
  };
  const moderation = { listReports: jest.fn(() => (overrides.reports ?? page(5))) };
  const realtime = { unreadCount: signal(3), refreshUnread: jest.fn() };

  TestBed.configureTestingModule({
    imports: [DashboardComponent],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { currentUser } },
      { provide: JobsService, useValue: jobs },
      { provide: ModerationService, useValue: moderation },
      { provide: RealtimeService, useValue: realtime },
    ],
  });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  fixture.detectChanges(); // les chiffres lus arrivent après le premier rendu
  const el = fixture.nativeElement as HTMLElement;
  const hrefs = () => Array.from(el.querySelectorAll('a')).map((a) => a.getAttribute('href'));
  return { fixture, el, jobs, moderation, realtime, currentUser, hrefs };
}

describe('DashboardComponent', () => {
  it('greets the member and lists activity and account links, without any admin tool', () => {
    const { el, hrefs, jobs, moderation } = setup(base);
    expect(el.textContent).toContain('Bonjour Aminata Diallo');
    expect(hrefs()).toEqual(expect.arrayContaining(['/forum/ask', '/tableau-de-bord/alertes', '/tableau-de-bord/profil/security', '/@aminata_dev']));
    expect(hrefs()).not.toContain('/tableau-de-bord/administration/utilisateurs');
    expect(jobs.getPlan).not.toHaveBeenCalled();
    expect(moderation.listReports).not.toHaveBeenCalled();
  });

  it('shows the recruiter tools with the plan read from the API', () => {
    const { el, hrefs, jobs } = setup({ ...base, isRecruiter: true, companyName: 'Gozem' });
    expect(jobs.getPlan).toHaveBeenCalledTimes(1);
    expect(hrefs()).toEqual(expect.arrayContaining(['/tableau-de-bord/offres', '/jobs/post', '/tableau-de-bord/plan']));
    expect(el.textContent).toContain('1/3 ce mois-ci');
  });

  it('shows the moderation queue sizes to a moderator, not the administration', () => {
    const { el, hrefs } = setup({ ...base, role: 'MODERATOR' });
    expect(el.textContent).toContain('5 en attente');
    expect(el.textContent).toContain('2 en attente');
    expect(hrefs()).toEqual(expect.arrayContaining(['/tableau-de-bord/moderation/signalements', '/tableau-de-bord/moderation/offres']));
    expect(hrefs()).not.toContain('/tableau-de-bord/administration/utilisateurs');
  });

  it('shows the administration to an administrator', () => {
    const { hrefs } = setup({ ...base, role: 'ADMIN' });
    expect(hrefs()).toEqual(expect.arrayContaining(['/tableau-de-bord/administration/indicateurs', '/tableau-de-bord/administration/utilisateurs', '/tableau-de-bord/administration/audit']));
  });

  it('still shows everything when the figures cannot be read', () => {
    const { el, hrefs } = setup(
      { ...base, role: 'ADMIN', isRecruiter: true },
      { plan: throwError(() => new Error('down')), reports: throwError(() => new Error('down')), review: throwError(() => new Error('down')) },
    );
    expect(hrefs()).toEqual(expect.arrayContaining(['/tableau-de-bord/plan', '/tableau-de-bord/moderation/signalements', '/tableau-de-bord/administration/utilisateurs']));
    expect(el.textContent).not.toMatch(/\d+ en attente/);
    expect(el.textContent).toContain('À modérer0');
  });

  it('shows the unread count and refreshes it when opened', () => {
    const { el, realtime } = setup(base);
    expect(realtime.refreshUnread).toHaveBeenCalled();
    expect(el.textContent).toContain('3');
  });

  it('waits for the profile, then fills the page', () => {
    const { fixture, el, currentUser } = setup(null);
    expect(el.textContent).toContain('Chargement de votre espace');
    expect(el.querySelectorAll('a')).toHaveLength(0);

    currentUser.set(base);
    fixture.detectChanges();
    expect(el.textContent).not.toContain('Chargement de votre espace');
    expect(el.querySelectorAll('a').length).toBeGreaterThan(5);
  });
});
