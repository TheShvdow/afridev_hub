import { Injectable, } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from './jwt.strategy';
import { DomainException } from '../../common/errors/domain.exception';

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.body?.refreshToken as string | undefined;

    if (!refreshToken) {
      throw new DomainException('AUTH_REFRESH_TOKEN_MISSING', 'Refresh token manquant.', 401);
    }

    if (!payload.jti) {
      throw new DomainException('AUTH_TOKEN_INVALID', 'Token invalide (pas de JTI).', 401);
    }

    const isValid = await this.redis.isRefreshTokenValid(payload.sub, payload.jti);
    if (!isValid) {
      throw new DomainException('AUTH_REFRESH_TOKEN_REVOKED', 'Refresh token révoqué ou expiré.', 401);
    }

    return { ...payload, refreshToken };
  }
}
