import { TestBed } from '@angular/core/testing';
import { PageHeroComponent } from './page-hero.component';
import { EMBEDDED_IN_DASHBOARD } from './embedded.token';

function render(embedded: boolean) {
  TestBed.configureTestingModule({
    imports: [PageHeroComponent],
    providers: embedded ? [{ provide: EMBEDDED_IN_DASHBOARD, useValue: true }] : [],
  });
  const fixture = TestBed.createComponent(PageHeroComponent);
  fixture.componentRef.setInput('title', 'Mes offres');
  fixture.componentRef.setInput('subtitle', 'Suivez vos offres.');
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('PageHeroComponent', () => {
  it('shows the large dark banner on the pages of the site', () => {
    const el = render(false);
    expect(el.querySelector('section.bg-\\[\\#0F1011\\]')).toBeTruthy();
    expect(el.textContent).toContain('Mes offres');
    expect(el.querySelector('h1')).toBeNull();
  });

  it('shows a compact header inside the dashboard', () => {
    const el = render(true);
    expect(el.querySelector('section')).toBeNull();
    expect(el.querySelector('h1')?.textContent).toContain('Mes offres');
    expect(el.textContent).toContain('Suivez vos offres.');
  });
});
