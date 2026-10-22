import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { rememberOAuthReturn } from '../oauth-return';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  override canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    rememberOAuthReturn(http.getRequest(), http.getResponse());
    return super.canActivate(context);
  }
}
