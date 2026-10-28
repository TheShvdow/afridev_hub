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
});
