import { Injectable, } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { DomainException } from '../../common/errors/domain.exception';
import { isUserBanned } from '../../common/moderation/user-ban';

export interface JwtPayload {
  sub:   string;  // userId
  email: string;
  role:  string;
  jti?:  string;  // JWT ID (pour blacklisting si nécessaire)
  iat?:  number;
  exp?:  number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, username: true, isVerified: true },
    });

    if (!user) throw new DomainException('AUTH_TOKEN_INVALID', 'Token invalide.', 401);

    // Relu à chaque requête : un ban prend effet immédiatement, même avec un access token encore valide.
    if (await isUserBanned(this.prisma, user.id)) {
      throw new DomainException('AUTH_ACCOUNT_BANNED', 'Compte suspendu.', 403);
    }
    // Un token émis avant la vérification obligatoire ne donne plus accès aux routes protégées.
    if (!user.isVerified) {
      throw new DomainException('AUTH_EMAIL_NOT_VERIFIED', 'Confirmez votre adresse email avant de continuer.', 403);
    }

    return user; // Injecté dans req.user
  }
}
