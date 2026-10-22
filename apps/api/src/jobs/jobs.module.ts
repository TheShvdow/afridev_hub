import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobAlertsService } from './job-alerts.service';
import { JobsScheduler } from './jobs.scheduler';
import { CurrencyModule } from '../currency/currency.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [CurrencyModule, UploadModule],
  controllers: [JobsController],
  providers: [JobsService, JobAlertsService, JobsScheduler],
})
export class JobsModule {}
