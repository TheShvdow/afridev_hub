import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { DomainException } from '../../common/errors/domain.exception';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: { role?: string } }>();

    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new DomainException(
        'AUTH_ROLE_FORBIDDEN',
        'Vous n\'avez pas les droits nécessaires pour cette action.',
        403,
      );
    }

    return true;
  }
}
