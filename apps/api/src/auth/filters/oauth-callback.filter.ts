import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { DomainException } from '../../common/errors/domain.exception';

// Callbacks OAuth : l'utilisateur arrive depuis GitHub ou Google dans son navigateur.
// Une erreur (code déjà utilisé ou expiré, compte banni, fournisseur indisponible) le
// renvoie vers la page de connexion du front avec un code lisible, jamais vers un JSON 500.
@Catch()
export class OAuthCallbackFilter implements ExceptionFilter {
  private readonly logger = new Logger(OAuthCallbackFilter.name);

  constructor(private readonly config: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const provider = /\/auth\/(github|google)\//.exec(req.path)?.[1] ?? 'oauth';
    const error = exception instanceof DomainException ? exception.code : 'AUTH_OAUTH_FAILED';
    this.logger.warn(`Connexion ${provider} échouée (${error}) : ${exception instanceof Error ? exception.message : String(exception)}`);

    const url = new URL('/auth/login', this.config.get<string>('WEB_URL', 'http://localhost:4200'));
    url.hash = new URLSearchParams({ provider, error }).toString();
    res.redirect(url.toString());
  }
}
