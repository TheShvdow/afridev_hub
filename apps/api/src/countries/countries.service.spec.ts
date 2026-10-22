import { CountriesService } from './countries.service';

describe('CountriesService', () => {
  it('lists African countries first, then the diaspora, each in French alphabetical order', async () => {
    const prisma = { country: { findMany: jest.fn().mockResolvedValue([
      { code: 'FR', alpha3: 'FRA', name: 'France', region: 'DIASPORA' },
      { code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' },
      { code: 'EG', alpha3: 'EGY', name: 'Égypte', region: 'AFRICA' },
      { code: 'BE', alpha3: 'BEL', name: 'Belgique', region: 'DIASPORA' },
      { code: 'DZ', alpha3: 'DZA', name: 'Algérie', region: 'AFRICA' },
    ]) } };
    const result = await new CountriesService(prisma as never).list();
    expect(result.map((c) => c.code)).toEqual(['DZ', 'EG', 'SN', 'BE', 'FR']);
  });
});
