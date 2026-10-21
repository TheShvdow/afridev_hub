import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

// Source publique, sans clé, mise à jour une fois par jour (décision 2026-10-21).
const RATES_URL = 'https://open.er-api.com/v6/latest/USD';
const FETCH_TIMEOUT_MS = 10_000;

interface OpenErApiResponse {
  result: string;
  rates?: Record<string, number>;
}

export interface RatesSnapshot {
  perUsd:    Map<string, number>;
  updatedAt: Date | null;
}

// FR-30 : conversion des salaires. Les taux sont stockés en base ; si la source est
// indisponible, les derniers taux connus restent utilisés.
@Injectable()
export class CurrencyService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CurrencyService.name);
  private cache: RatesSnapshot | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // Premier démarrage sans taux : on les charge sans bloquer le démarrage.
  onApplicationBootstrap() {
    this.prisma.exchangeRate.count()
      .then((count) => (count === 0 ? this.refreshRates() : undefined))
      .catch((error) => this.logger.warn(`Taux de change non chargés au démarrage : ${String(error)}`));
  }

  @Cron('0 2 * * *', { name: 'currency-refresh' })
  async refreshRates(): Promise<number> {
    const rates = await this.fetchRates();
    if (!rates) return 0;

    const entries = Object.entries(rates).filter(([code, perUsd]) => /^[A-Z]{3}$/.test(code) && perUsd > 0);
    await this.prisma.$transaction(
      entries.map(([currency, perUsd]) =>
        this.prisma.exchangeRate.upsert({
          where:  { currency },
          create: { currency, perUsd },
          update: { perUsd },
        }),
      ),
    );
    this.cache = null;
    this.logger.log(`Taux de change mis à jour (${entries.length} devises)`);
    this.events.emit('currency.rates.updated', { currencies: entries.length });
    return entries.length;
  }

  async getRates(): Promise<RatesSnapshot> {
    if (this.cache) return this.cache;
    const rows = await this.prisma.exchangeRate.findMany();
    this.cache = {
      perUsd:    new Map(rows.map((row) => [row.currency, row.perUsd])),
      updatedAt: rows.reduce<Date | null>((latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest), null),
    };
    return this.cache;
  }

  // Montant entier converti, ou null si l'une des devises est inconnue.
  convert(amount: number, from: string, to: string, rates: RatesSnapshot): number | null {
    if (from === to) return amount;
    const fromRate = rates.perUsd.get(from);
    const toRate = rates.perUsd.get(to);
    if (!fromRate || !toRate) return null;
    return Math.round((amount / fromRate) * toRate);
  }

  toUsd(amount: number, from: string, rates: RatesSnapshot): number | null {
    return this.convert(amount, from, 'USD', rates);
  }

  private async fetchRates(): Promise<Record<string, number> | null> {
    try {
      const response = await fetch(RATES_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as OpenErApiResponse;
      if (body.result !== 'success' || !body.rates) throw new Error(`réponse inattendue (${body.result})`);
      return body.rates;
    } catch (error) {
      this.logger.error(`Taux de change indisponibles, derniers taux conservés : ${String(error)}`);
      return null;
    }
  }
}
