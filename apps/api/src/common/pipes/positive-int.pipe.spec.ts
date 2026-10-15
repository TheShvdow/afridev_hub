import { BadRequestException } from '@nestjs/common';
import { PositiveIntPipe, MAX_PAGE_LIMIT } from './positive-int.pipe';

describe('PositiveIntPipe', () => {
  it('accepte un entier positif, en nombre ou en chaîne', () => {
    const pipe = new PositiveIntPipe(MAX_PAGE_LIMIT);
    expect(pipe.transform(1)).toBe(1);
    expect(pipe.transform('20')).toBe(20);
    expect(pipe.transform(MAX_PAGE_LIMIT)).toBe(MAX_PAGE_LIMIT);
  });

  it.each([0, -1, 1.5, 'abc', '', 'NaN', MAX_PAGE_LIMIT + 1, '1000000'])(
    'refuse la valeur %p',
    (value) => {
      expect(() => new PositiveIntPipe(MAX_PAGE_LIMIT).transform(value)).toThrow(BadRequestException);
    },
  );

  it('sans borne explicite, accepte toute taille entière positive', () => {
    expect(new PositiveIntPipe().transform('1000000')).toBe(1000000);
  });
});
