import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { BictorysProvider } from './providers/bictorys.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, BictorysProvider],
})
export class PaymentsModule {}
