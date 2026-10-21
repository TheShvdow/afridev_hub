import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BictorysProvider } from './providers/bictorys.provider';
import { PAYMENT_PROVIDER } from './providers/payment-provider.interface';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    BictorysProvider,
    // Agrégateur actif (décision 2026-10-14 : Bictorys).
    { provide: PAYMENT_PROVIDER, useExisting: BictorysProvider },
  ],
})
export class PaymentsModule {}
