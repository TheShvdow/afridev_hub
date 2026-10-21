import { COUNTRIES, COUNTRY_CODES, isCountryCode } from './countries';

describe('COUNTRIES', () => {
  it('liste les 54 pays africains puis 15 pays de la diaspora, sans doublon', () => {
    expect(COUNTRY_CODES).toHaveLength(69);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    expect(COUNTRY_CODES.slice(0, 54)).toContain('SN');
    expect(COUNTRY_CODES.slice(54)).toEqual(
      ['FR', 'BE', 'CH', 'LU', 'DE', 'IT', 'ES', 'PT', 'NL', 'GB', 'US', 'CA', 'BR', 'AE', 'QA'],
    );
  });

  it('n’utilise que des codes ISO 3166-1 alpha-2 bien formés', () => {
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
    expect(COUNTRIES.SN).toBe('Sénégal');
  });

  it('ne reconnaît que les codes de la liste', () => {
    expect(isCountryCode('CI')).toBe(true);
    expect(isCountryCode('ci')).toBe(false);
    expect(isCountryCode('toString')).toBe(false);
  });
});
