import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../../core/store/auth.store';
import { Footer } from './footer';

function setup(authenticated: boolean) {
  TestBed.configureTestingModule({
    imports: [Footer],
    providers: [provideRouter([]), { provide: AuthStore, useValue: { isAuthenticated: signal(authenticated) } }],
  });
  const fixture = TestBed.createComponent(Footer);
  fixture.detectChanges();
  const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
  return { text: (fixture.nativeElement as HTMLElement).textContent ?? '', hrefs: links.map((a) => a.getAttribute('href')) };
}

describe('Footer', () => {
  it('invites a visitor to join, towards the registration', () => {
    const { text, hrefs } = setup(false);
    expect(text).toContain('Rejoindre');
    expect(text).not.toContain('Mon tableau de bord');
    expect(hrefs).toContain('/auth/register');
  });

  it('offers a signed-in member their dashboard instead of asking to join', () => {
    const { text, hrefs } = setup(true);
    expect(text).not.toContain('Rejoindre');
    expect(text).toContain('Mon tableau de bord');
    expect(hrefs).toContain('/tableau-de-bord');
    expect(hrefs).not.toContain('/auth/register');
  });

  it('sends the logo to the home page, not to a dead anchor', () => {
    const { hrefs } = setup(false);
    expect(hrefs).toContain('/');
    expect(hrefs).not.toContain('#');
  });

  it('propose les sections du site et les pages légales', () => {
    const { hrefs } = setup(false);
    for (const to of ['/forum', '/projets', '/jobs', '/mentorat', '/communautes', '/forum/ask', '/projects/new', '/jobs/post', '/jobs/alerts']) {
      expect(hrefs).toContain(to);
    }
    for (const to of ['/conditions-generales', '/confidentialite', '/cookies', '/mentions-legales']) {
      expect(hrefs).toContain(to);
    }
  });

  it('offre à un visiteur la connexion, l\'inscription et la réinitialisation du mot de passe', () => {
    const { hrefs } = setup(false);
    expect(hrefs).toEqual(expect.arrayContaining(['/auth/login', '/auth/register', '/auth/forgot-password']));
    expect(hrefs).not.toContain('/profile');
  });

  it('offre à un membre connecté son espace plutôt que la connexion', () => {
    const { hrefs } = setup(true);
    expect(hrefs).toEqual(expect.arrayContaining(['/tableau-de-bord', '/profile', '/notifications', '/jobs/mine']));
    expect(hrefs).not.toContain('/auth/login');
    expect(hrefs).not.toContain('/auth/forgot-password');
  });

  it('n\'utilise aucun lien mort', () => {
    for (const authenticated of [false, true]) {
      const { hrefs } = setup(authenticated);
      expect(hrefs.every((href) => !!href && href !== '#')).toBe(true);
      TestBed.resetTestingModule();
    }
  });
});
