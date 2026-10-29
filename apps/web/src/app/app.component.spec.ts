import { hidesSiteChrome } from './app.component';

describe('hidesSiteChrome', () => {
  it('hides the site navbar and footer on the sign-in screens and in the dashboard', () => {
    expect(hidesSiteChrome('/auth/login')).toBe(true);
    expect(hidesSiteChrome('/tableau-de-bord')).toBe(true);
    expect(hidesSiteChrome('/tableau-de-bord/profil/account')).toBe(true);
  });

  it('keeps them on every other page', () => {
    for (const url of ['/', '/forum', '/jobs/plan', '/@aminata_dev', '/admin']) {
      expect(hidesSiteChrome(url)).toBe(false);
    }
  });
});
