import { FormControl } from '@angular/forms';
import { parseStackList, stackListValidator } from './stack-list';

describe('parseStackList', () => {
  it('découpe sur les virgules et retire les espaces', () => {
    expect(parseStackList('TypeScript, NestJS , docker')).toEqual(['TypeScript', 'NestJS', 'docker']);
  });

  it('ignore les éléments vides et les doublons, casse comprise', () => {
    expect(parseStackList(' , Angular,, angular ,ANGULAR,')).toEqual(['Angular']);
  });

  it('renvoie une liste vide pour une saisie vide', () => {
    expect(parseStackList('')).toEqual([]);
    expect(parseStackList('  ,  ')).toEqual([]);
  });
});

describe('stackListValidator', () => {
  const check = (value: string) => stackListValidator(new FormControl(value, { nonNullable: true }));

  it('accepte une liste vide, 10 technologies et un élément de 30 caractères', () => {
    expect(check('')).toBeNull();
    expect(check('a,b,c,d,e,f,g,h,i,j')).toBeNull();
    expect(check('x'.repeat(30))).toBeNull();
  });

  it('refuse plus de 10 technologies', () => {
    expect(check('a,b,c,d,e,f,g,h,i,j,k')).toEqual({ stackTooMany: true });
  });

  it('refuse un élément de plus de 30 caractères', () => {
    expect(check('x'.repeat(31))).toEqual({ stackItemTooLong: true });
  });
});
