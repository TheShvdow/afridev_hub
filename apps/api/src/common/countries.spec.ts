import { COUNTRIES, COUNTRY_CODES, COUNTRY_RECORDS, isCountryCode, toCountryCode } from './countries';

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

describe('COUNTRY_RECORDS', () => {
  it('donne à chaque pays un code alpha-3 unique et sa région', () => {
    expect(COUNTRY_RECORDS).toHaveLength(69);
    expect(new Set(COUNTRY_RECORDS.map((c) => c.alpha3)).size).toBe(69);
    for (const country of COUNTRY_RECORDS) expect(country.alpha3).toMatch(/^[A-Z]{3}$/);
    expect(COUNTRY_RECORDS.find((c) => c.code === 'SN')).toEqual({ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' });
    expect(COUNTRY_RECORDS.find((c) => c.code === 'FR')?.region).toBe('DIASPORA');
    expect(COUNTRY_RECORDS.filter((c) => c.region === 'AFRICA')).toHaveLength(54);
  });

  it('met un code en majuscules sans accepter autre chose que 2 lettres', () => {
    expect(toCountryCode(' sn ')).toBe('SN');
    expect(toCountryCode('Sénégal')).toBe('Sénégal');
  });
});
