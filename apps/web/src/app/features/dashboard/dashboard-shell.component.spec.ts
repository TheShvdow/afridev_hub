import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import type { UserMe } from '@afridev/shared-types';
import { AuthStore } from '../../core/store/auth.store';
import { JobsService } from '../../core/services/jobs.service';
import { ModerationService } from '../../core/services/moderation.service';
import { RealtimeService } from '../../core/services/realtime.service';
import { DashboardShellComponent, needsPagePadding } from './dashboard-shell.component';

const base: UserMe = {
  id: 'u1', email: 'a@x.io', username: 'aminata_dev', displayName: 'Aminata Diallo', avatarUrl: null, role: 'MEMBER',
  isVerified: false, reputation: 215, emailNotifications: true, isRecruiter: false, companyName: null,
  preferredCurrency: null, createdAt: '2026-10-01T00:00:00Z',
};
const page = (total: number) => of({ data: [], meta: { total, page: 1, limit: 20, totalPages: 1 } });

function setup(user: UserMe | null) {
  const currentUser = signal<UserMe | null>(user);
  const signOut = jest.fn();
  TestBed.configureTestingModule({
    imports: [DashboardShellComponent],
    providers: [
      provideRouter([]),
      { provide: AuthStore, useValue: { currentUser, signOut } },
      { provide: JobsService, useValue: { getPlan: () => of({ planType: 'FREE', isPremium: false, premiumUntil: null, offersThisMonth: 1, monthlyLimit: 3 }), listPendingReview: () => page(2) } },
      { provide: ModerationService, useValue: { listReports: () => page(4) } },
      { provide: RealtimeService, useValue: { unreadCount: signal(3), refreshUnread: jest.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(DashboardShellComponent);
  fixture.detectChanges();
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const hrefs = () => Array.from(el.querySelectorAll('aside a')).map((a) => a.getAttribute('href'));
  return { fixture, el, hrefs, signOut, currentUser };
}

describe('DashboardShellComponent', () => {
  it('offers a way back to the main site, whatever the role', () => {
    for (const role of ['MEMBER', 'MODERATOR', 'ADMIN'] as const) {
      TestBed.resetTestingModule();
      const { el } = setup({ ...base, role });
      const back = Array.from(el.querySelectorAll('aside a')).find((a) => a.textContent?.includes('Retour au site'));
      expect(back?.getAttribute('href')).toBe('/');
    }
  });

  it('lists the overview and the sections of a member in the sidebar, without any tool of another role', () => {
    const { el, hrefs } = setup(base);
    expect(el.querySelector('aside')?.textContent).toContain('Vue d\'ensemble');
    expect(hrefs()).toEqual(expect.arrayContaining(['/tableau-de-bord', '/tableau-de-bord/notifications', '/tableau-de-bord/profil/account', '/forum/ask', '/@aminata_dev']));
    expect(hrefs()).not.toContain('/tableau-de-bord/moderation/signalements');
    expect(hrefs()).not.toContain('/tableau-de-bord/administration/utilisateurs');
  });

  it('shows the name, the handle and the roles of the account', () => {
    const { el } = setup({ ...base, role: 'MODERATOR', isRecruiter: true });
    const card = el.querySelector('aside')?.textContent ?? '';
    expect(card).toContain('Aminata Diallo');
    expect(card).toContain('@aminata_dev');
    expect(card).toContain('Recruteur');
    expect(card).toContain('Modérateur');
  });

  it('shows the moderation and administration sections to an administrator, with the pending counts', () => {
    const { el, hrefs } = setup({ ...base, role: 'ADMIN' });
    expect(hrefs()).toEqual(expect.arrayContaining(['/tableau-de-bord/moderation/signalements', '/tableau-de-bord/administration/audit']));
    expect(el.querySelector('aside')?.textContent).toContain('4 en attente');
  });

  it('shows no public profile entry for an administrator', () => {
    const { hrefs } = setup({ ...base, role: 'ADMIN' });
    expect(hrefs()).not.toContain('/@aminata_dev');
  });

  it('marks the pages of the site with an arrow, and the unread notifications with a count', () => {
    const { el } = setup(base);
    const links = Array.from(el.querySelectorAll('aside li a'));
    const forum = links.find((a) => a.getAttribute('href') === '/forum');
    const notifications = links.find((a) => a.getAttribute('href') === '/tableau-de-bord/notifications');
    expect(forum?.querySelector('app-icon[name="arrow-up-right"]')).toBeTruthy();
    expect(notifications?.textContent).toContain('3');
  });

  it('opens and closes the drawer on a phone', () => {
    const { fixture, el } = setup(base);
    const aside = el.querySelector('aside') as HTMLElement;
    expect(aside.classList).toContain('-translate-x-full');

    (el.querySelector('header button[aria-label="Ouvrir le menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(aside.classList).toContain('translate-x-0');
    expect(el.querySelector('header button')?.getAttribute('aria-expanded')).toBe('true');

    (aside.querySelector('button[aria-label="Fermer le menu"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(aside.classList).toContain('-translate-x-full');
  });

  it('closes the drawer once a link is followed', () => {
    const { fixture, el } = setup(base);
    (el.querySelector('header button') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('aside nav a[href="/tableau-de-bord/notifications"]') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect((el.querySelector('aside') as HTMLElement).classList).toContain('-translate-x-full');
  });

  it('signs out and goes back to the home page', () => {
    const { el, signOut } = setup(base);
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const button = Array.from(el.querySelectorAll('aside button')).find((b) => b.textContent?.includes('Déconnexion')) as HTMLButtonElement;
    button.click();
    expect(signOut).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('gives a margin to the moderation and administration pages only', () => {
    for (const url of ['/tableau-de-bord/moderation/signalements', '/tableau-de-bord/moderation/offres', '/tableau-de-bord/administration/audit']) {
      expect(needsPagePadding(url)).toBe(true);
    }
    for (const url of ['/tableau-de-bord', '/tableau-de-bord/notifications', '/tableau-de-bord/profil/account', '/tableau-de-bord/offres']) {
      expect(needsPagePadding(url)).toBe(false);
    }
  });

  it('waits for the profile without breaking', () => {
    const { el, fixture, currentUser } = setup(null);
    expect(el.querySelector('aside nav')).toBeTruthy();
    currentUser.set(base);
    fixture.detectChanges();
    expect(el.querySelector('aside')?.textContent).toContain('Aminata Diallo');
  });
});
