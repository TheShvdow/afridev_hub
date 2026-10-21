import { BadRequestException } from '@nestjs/common';
import { OptionalCountryCodePipe } from './country-code.pipe';

describe('OptionalCountryCodePipe', () => {
  const pipe = new OptionalCountryCodePipe();

  it('accepte un code de la liste, sans tenir compte de la casse', () => {
    expect(pipe.transform('SN')).toBe('SN');
    expect(pipe.transform('ci')).toBe('CI');
    expect(pipe.transform(' fr ')).toBe('FR');
  });

  it.each([undefined, null, ''])('laisse le filtre vide pour %p', (value) => {
    expect(pipe.transform(value)).toBeUndefined();
  });

  it.each(['ZZ', 'SEN', 'Sénégal', 'JP', 'ß', 'sß'])('refuse %p', (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);
  });
});
