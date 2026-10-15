import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

// Borne maximale d'une page : une requête ne peut pas charger une liste entière.
export const MAX_PAGE_LIMIT = 100;

// Entier strictement positif, au plus `max`. Sert aux paramètres `page` et `limit`.
@Injectable()
export class PositiveIntPipe implements PipeTransform<unknown, number> {
  constructor(private readonly max: number = Number.MAX_SAFE_INTEGER) {}

  transform(value: unknown): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(n) || n < 1 || n > this.max) {
      throw new BadRequestException(`Le paramètre doit être un entier entre 1 et ${this.max}.`);
    }
    return n;
  }
}
