import { TestBed } from '@angular/core/testing';
import { PreviewBannerComponent } from './preview-banner.component';

describe('PreviewBannerComponent', () => {
  it('says which feature is coming soon, as a status message', () => {
    const fixture = TestBed.createComponent(PreviewBannerComponent);
    fixture.componentRef.setInput('feature', 'Le mentorat');
    fixture.detectChanges();

    const banner = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(banner.textContent).toContain('Aperçu');
    expect(banner.textContent).toContain('Le mentorat arrive bientôt');
    expect(banner.textContent).toContain('exemples');
  });
});
