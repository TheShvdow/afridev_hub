import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { GamificationController } from './gamification.controller';
import { GamificationListener } from './gamification.listener';

@Module({
  controllers: [GamificationController],
  providers: [GamificationService, GamificationListener],
  exports: [GamificationService],
})
export class GamificationModule {}
