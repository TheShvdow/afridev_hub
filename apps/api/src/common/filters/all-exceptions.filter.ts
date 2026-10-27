import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorEnvelope, ErrorCode } from '@afridev/shared-types';
import { DomainException } from '../errors/domain.exception';

// Code générique par statut HTTP pour les exceptions framework (guards, pipes, 404 de route…).
const GENERIC_CODE: Partial<Record<number, ErrorCode>> = {
  400: 'COMMON_BAD_REQUEST',
  401: 'COMMON_UNAUTHORIZED',
  403: 'COMMON_FORBIDDEN',
  404: 'COMMON_NOT_FOUND',
  409: 'COMMON_CONFLICT',
  429: 'COMMON_TOO_MANY_REQUESTS',
  503: 'COMMON_SERVICE_UNAVAILABLE',
};

// Enveloppe d'erreur AD-7 : { error: { code, message, details? } }.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toEnvelope(exception);
    response.status(status).json(body);
  }

  private toEnvelope(exception: unknown): { status: number; body: ApiErrorEnvelope } {
    if (exception instanceof DomainException) {
      return {
        status: exception.getStatus(),
        body: { error: { code: exception.code, message: exception.userMessage } },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const messages =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? (payload as { message: unknown }).message
          : undefined;

      // Erreurs de validation (ValidationPipe) : message = tableau de contraintes.
      if (status === 400 && Array.isArray(messages)) {
        return {
          status,
          body: {
            error: {
              code: 'COMMON_VALIDATION_FAILED',
              message: 'Requête invalide.',
              details: messages as string[],
            },
          },
        };
      }

      // Le throttler renvoie un texte anglais technique ; on le remplace par un message lisible.
      if (status === 429) {
        return {
          status,
          body: { error: { code: 'COMMON_TOO_MANY_REQUESTS', message: 'Trop de requêtes. Réessayez dans un instant.' } },
        };
      }

      const message = typeof messages === 'string' ? messages : exception.message;
      return {
        status,
        body: { error: { code: GENERIC_CODE[status] ?? 'COMMON_BAD_REQUEST', message } },
      };
    }

    // Erreur non prévue : on journalise, on ne fuite jamais le détail au client.
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return {
      status: 500,
      body: { error: { code: 'COMMON_INTERNAL_ERROR', message: 'Erreur interne du serveur.' } },
    };
  }
}
