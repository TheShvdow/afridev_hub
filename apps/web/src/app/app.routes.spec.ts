import { UrlSegment } from '@angular/router';
import { profileMatcher } from './app.routes';

const segments = (...paths: string[]) => paths.map((path) => new UrlSegment(path, {}));

describe('profileMatcher (/@pseudo)', () => {
  it('matches a single segment that starts with @ and exposes the username without it', () => {
    const result = profileMatcher(segments('@aminata_dev'));
    expect(result?.consumed).toHaveLength(1);
    expect(result?.posParams?.['username'].path).toBe('aminata_dev');
  });

  it('does not match a plain segment, a lone @, or a longer path', () => {
    expect(profileMatcher(segments('aminata'))).toBeNull();
    expect(profileMatcher(segments('@'))).toBeNull();
    expect(profileMatcher(segments('@aminata', 'badges'))).toBeNull();
    expect(profileMatcher([])).toBeNull();
  });
});
