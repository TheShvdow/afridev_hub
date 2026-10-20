import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { ForumListener } from './forum.listener';

@Module({
  controllers: [ForumController],
  providers: [ForumService, ForumListener],
  exports: [ForumService],
})
export class ForumModule {}
