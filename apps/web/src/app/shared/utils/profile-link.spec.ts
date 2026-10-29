import { hasPublicProfile, profilePath } from './profile-link';

describe('profile link', () => {
  it('points to /@username for a member and a moderator', () => {
    expect(profilePath({ username: 'aminata', role: 'MEMBER' })).toBe('/@aminata');
    expect(profilePath({ username: 'koffi', role: 'MODERATOR' })).toBe('/@koffi');
  });

  it('keeps the link when the role is not known', () => {
    expect(profilePath({ username: 'aminata' })).toBe('/@aminata');
  });

  it('gives no link to an administrator', () => {
    expect(profilePath({ username: 'awa', role: 'ADMIN' })).toBeNull();
    expect(hasPublicProfile({ role: 'ADMIN' })).toBe(false);
    expect(hasPublicProfile({ role: 'MEMBER' })).toBe(true);
    expect(hasPublicProfile(null)).toBe(false);
  });
});
