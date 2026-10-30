import { TestBed } from '@angular/core/testing';
import { Communautes } from './communautes';

describe('Communautes (aperçu de la phase 2)', () => {
  function create() {
    const fixture = TestBed.createComponent(Communautes);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the preview banner', () => {
    expect(create().querySelector('app-preview-banner')?.textContent).toContain('Les communautés arrive bientôt');
  });

  it('lists the example communities', () => {
    expect(create().textContent).toContain('Dev Sénégal');
  });

  it('has no active action: every button is disabled and there is no dead "#" link', () => {
    const root = create();
    const buttons = Array.from(root.querySelectorAll('button'));

    expect(buttons.length).toBeGreaterThan(0);
    expect(buttons.every((button) => button.disabled)).toBe(true);
    expect(root.querySelector('a[href="#"]')).toBeNull();
    expect(root.textContent).toContain('Rejoindre le groupe');
    expect(root.textContent).toContain('Je participe');
  });
});
