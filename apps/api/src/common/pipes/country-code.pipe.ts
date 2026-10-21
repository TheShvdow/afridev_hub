import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { CountryCode, isCountryCode } from '../countries';

// Filtre pays optionnel : absent ou vide → undefined ; casse ignorée (`sn` → `SN`) ;
// code hors de la liste des pays acceptés → 400.
@Injectable()
export class OptionalCountryCodePipe implements PipeTransform<unknown, CountryCode | undefined> {
  transform(value: unknown): CountryCode | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const raw = String(value).trim();
    // Deux lettres ASCII avant la mise en majuscules : `'ß'.toUpperCase()` donne `SS`.
    const code = /^[a-z]{2}$/i.test(raw) ? raw.toUpperCase() : '';
    if (!isCountryCode(code)) {
      throw new BadRequestException('Le pays doit être un code de la liste des pays acceptés (ex. SN).');
    }
    return code;
  }
}
