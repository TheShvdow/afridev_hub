import { needsOnboarding, skipOnboarding } from './onboarding';

const base = { id: 'u1', role: 'USER' as const, country: null, level: null, stack: [] as string[] };

describe('needsOnboarding', () => {
  beforeEach(() => localStorage.clear());

  it('propose les écrans quand le profil est vide', () => {
    expect(needsOnboarding(base)).toBe(true);
  });

  it('ne les propose pas si un champ est déjà rempli', () => {
    expect(needsOnboarding({ ...base, country: 'SN' })).toBe(false);
    expect(needsOnboarding({ ...base, level: 'SENIOR' })).toBe(false);
    expect(needsOnboarding({ ...base, stack: ['Angular'] })).toBe(false);
  });

  it('ne les propose ni à l\'administrateur ni sans utilisateur', () => {
    expect(needsOnboarding({ ...base, role: 'ADMIN' })).toBe(false);
    expect(needsOnboarding(null)).toBe(false);
  });

  it('ne revient plus une fois passé', () => {
    skipOnboarding('u1');
    expect(needsOnboarding(base)).toBe(false);
    expect(needsOnboarding({ ...base, id: 'u2' })).toBe(true);
  });
});
