import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '@afridev/shared-types';

// Exception métier (AD-7) : code DOMAINE_ENTITE_RAISON + message lisible.
// Le filtre global la transforme en { error: { code, message } }.
export class DomainException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    readonly userMessage: string,
    status = 400,
  ) {
    super({ code, message: userMessage }, status);
  }
}
