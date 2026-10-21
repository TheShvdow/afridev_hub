import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Route publique qui lit le JWT s'il est présent : request.user vaut null sinon.
// Un jeton invalide ou expiré ne bloque pas la requête, elle est traitée en anonyme.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | null {
    return user || null;
  }
}
