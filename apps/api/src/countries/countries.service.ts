import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const byName = new Intl.Collator('fr', { sensitivity: 'base' });
const REGION_ORDER: Record<string, number> = { AFRICA: 0, DIASPORA: 1 };

const byRegionThenName = (a: { region: string; name: string }, b: { region: string; name: string }) =>
  REGION_ORDER[a.region] - REGION_ORDER[b.region] || byName.compare(a.name, b.name);

// Liste des pays pour les listes déroulantes du front : pays africains d'abord, puis la
// diaspora, chacun par ordre alphabétique français (« Égypte » se range avec les E).
@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const countries = await this.prisma.country.findMany({
      select: { code: true, alpha3: true, name: true, region: true },
    });
    return countries.sort(byRegionThenName);
  }
}
