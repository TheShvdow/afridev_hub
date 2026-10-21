import { Module } from '@nestjs/common';
import { GithubService } from './github.service';

// Service d'infrastructure : accès en lecture à l'API publique GitHub.
@Module({
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
