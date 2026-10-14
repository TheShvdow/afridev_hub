import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../redis/redis.service';
import { JwtPayload } from './jwt.strategy';

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
      throw new UnauthorizedException('Refresh token manquant.');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Token invalide (pas de JTI).');
    }

    const isValid = await this.redis.isRefreshTokenValid(payload.sub, payload.jti);
    if (!isValid) {
      throw new UnauthorizedException('Refresh token révoqué ou expiré.');
    }

    return { ...payload, refreshToken };
  }
}
