import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { LEGAL_DOCS, LEGAL_LINKS, LegalSlug } from './legal-content';
import { LegalPageComponent } from './legal-page.component';

function render(slug: LegalSlug) {
  TestBed.configureTestingModule({
    imports: [LegalPageComponent],
    providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { data: { doc: slug } } } }],
  });
  const fixture = TestBed.createComponent(LegalPageComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('pages légales', () => {
  const slugs = Object.keys(LEGAL_DOCS) as LegalSlug[];

  it.each(slugs)('%s : un titre, une introduction et des sections non vides', (slug) => {
    const doc = LEGAL_DOCS[slug];
    expect(doc.slug).toBe(slug);
    expect(doc.title.length).toBeGreaterThan(0);
    expect(doc.intro.length).toBeGreaterThan(0);
    expect(doc.sections.length).toBeGreaterThan(0);
    for (const section of doc.sections) {
      expect((section.paragraphs?.length ?? 0) + (section.items?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it('chaque page est liée une fois dans la navigation et dans le pied de page', () => {
    expect(LEGAL_LINKS.map((link) => link.slug).sort()).toEqual([...slugs].sort());
  });

  it.each(slugs)('%s : affiche son titre et renvoie vers les trois autres pages', (slug) => {
    const element = render(slug);
    expect(element.querySelector('h1')?.textContent).toContain(LEGAL_DOCS[slug].title);
    expect(element.querySelectorAll('nav a').length).toBe(slugs.length - 1);
    expect(element.querySelectorAll('h2').length).toBe(LEGAL_DOCS[slug].sections.length);
  });
});
