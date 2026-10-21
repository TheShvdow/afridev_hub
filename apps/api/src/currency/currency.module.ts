import { Module } from '@nestjs/common';
import { CurrencyService } from './currency.service';

// Service d'infrastructure (comme Redis ou Mail) : utilisable par les modules de domaine.
@Module({
  providers: [CurrencyService],
  exports: [CurrencyService],
})
export class CurrencyModule {}
