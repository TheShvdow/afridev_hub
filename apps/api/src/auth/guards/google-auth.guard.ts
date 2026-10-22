import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { DomainException } from '../../common/errors/domain.exception';
import { rememberOAuthReturn } from '../oauth-return';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly config: ConfigService) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    if (!this.config.get<string>('GOOGLE_CLIENT_ID')) {
      throw new DomainException('AUTH_PROVIDER_NOT_CONFIGURED', 'La connexion Google n\'est pas configurée.', 503);
    }
    const http = context.switchToHttp();
    rememberOAuthReturn(http.getRequest(), http.getResponse());
    return super.canActivate(context);
  }
}
