import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AuthEmailVerifiedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import type { User } from '@prisma/client';
import { DomainException } from '../common/errors/domain.exception';

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL_MS  = 15 * 60 * 1000;           // 15 min
const REFRESH_TTL_S  = 7 * 24 * 60 * 60;         // 7 jours en secondes
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;  // lien de vérification : 24 h

type SafeUser = Omit<User, 'passwordHash'>;

export interface OAuthProfileInput {
  provider:          'github' | 'google';
  providerAccountId: string;
  email:             string;
  emailVerified:     boolean;
  username:          string;
  displayName:       string;
  avatarUrl:         string | null;
}

export type OAuthLoginResult =
  | { type: 'tokens'; tokens: AuthTokensResult }
  | { type: 'link'; linkToken: string; email: string };

export interface AuthTokensResult {
  accessToken:  string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Inscription ─────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) {
      if (existing.email === dto.email) {
        throw new DomainException('AUTH_EMAIL_TAKEN', 'Cet email est déjà utilisé.', 409);
      }
      throw new DomainException('AUTH_USERNAME_TAKEN', 'Ce nom d\'utilisateur est déjà pris.', 409);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email:        dto.email,
        username:     dto.username,
        passwordHash,
      },
    });

    await this.sendVerificationEmail(user).catch((error: unknown) => {
      // L'inscription réussit même si l'email échoue : le renvoi reste possible.
      this.logger.error('Envoi de l\'email de vérification impossible', error instanceof Error ? error.stack : String(error));
    });

    return this.generateTokenPair(user);
  }

  // ── Vérification email ──────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const record = await this.prisma.verificationToken.findUnique({ where: { token } });
    if (!record || record.expires.getTime() < Date.now()) {
      throw new DomainException('AUTH_VERIFICATION_TOKEN_INVALID', 'Lien de vérification invalide ou expiré.', 400);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.identifier }, data: { isVerified: true } }),
      this.prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
    ]);

    const payload: AuthEmailVerifiedEvent = { userId: record.identifier };
    this.events.emit('auth.email.verified', payload);

    return { message: 'Email vérifié.' };
  }

  async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainException('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable.', 401);
    if (user.isVerified) {
      throw new DomainException('AUTH_ALREADY_VERIFIED', 'Cet email est déjà vérifié.', 409);
    }

    await this.sendVerificationEmail(user);
    return { message: 'Email de vérification renvoyé.' };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Un seul lien valide à la fois : on remplace les précédents.
    await this.prisma.verificationToken.deleteMany({ where: { identifier: user.id } });

    const token = randomBytes(32).toString('hex');
    await this.prisma.verificationToken.create({
      data: { identifier: user.id, token, expires: new Date(Date.now() + VERIFICATION_TTL_MS) },
    });

    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');
    const link = `${webUrl}/auth/verify-email?token=${token}`;

    if (process.env['NODE_ENV'] !== 'production') {
      // Sandbox : le lien est visible dans les logs pour tester le parcours sans boîte mail.
      this.logger.log(`Lien de vérification (sandbox) pour ${user.email} : ${link}`);
    }

    await this.mail.send(
      user.email,
      'Confirmez votre adresse email',
      `<p>Bonjour ${user.username},</p><p>Confirmez votre adresse : <a href="${link}">${link}</a></p><p>Ce lien expire dans 24 heures.</p>`,
    );
  }

  // ── Connexion ────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.', 401);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.', 401);
    }

    return this.generateTokenPair(user);
  }

  // ── GitHub OAuth ─────────────────────────────────────────────────────

  // Connexion OAuth (GitHub, Google). Aucun lien automatique avec un compte existant :
  // si l'email appartient déjà à un compte, l'utilisateur doit confirmer la liaison
  // avec le mot de passe de ce compte (linkOAuthAccount).
  async resolveOAuthLogin(input: OAuthProfileInput): Promise<OAuthLoginResult> {
    const existing = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: input.provider, providerAccountId: input.providerAccountId } },
      include: { user: true },
    });
    if (existing) {
      return { type: 'tokens', tokens: await this.generateTokenPair(existing.user) };
    }

    const sameEmail = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (sameEmail) {
      const linkToken = await this.jwt.signAsync(
        { typ: 'oauth-link', provider: input.provider, providerAccountId: input.providerAccountId, userId: sameEmail.id },
        { secret: this.config.getOrThrow<string>('JWT_SECRET'), expiresIn: '10m' },
      );
      return { type: 'link', linkToken, email: input.email };
    }

    const user = await this.prisma.user.create({
      data: {
        email:       input.email,
        username:    await this.uniqueUsername(input.username),
        displayName: input.displayName || null,
        avatarUrl:   input.avatarUrl,
        isVerified:  input.emailVerified,
        accounts:    { create: { provider: input.provider, providerAccountId: input.providerAccountId } },
      },
    });
    return { type: 'tokens', tokens: await this.generateTokenPair(user) };
  }

  // Liaison confirmée par le mot de passe du compte existant.
  async linkOAuthAccount(linkToken: string, password: string): Promise<AuthTokensResult> {
    let claims: { typ?: string; provider?: string; providerAccountId?: string; userId?: string };
    try {
      claims = await this.jwt.verifyAsync(linkToken, { secret: this.config.getOrThrow<string>('JWT_SECRET') });
    } catch {
      throw new DomainException('AUTH_LINK_TOKEN_INVALID', 'Lien de liaison invalide ou expiré.', 400);
    }
    if (claims.typ !== 'oauth-link' || !claims.provider || !claims.providerAccountId || !claims.userId) {
      throw new DomainException('AUTH_LINK_TOKEN_INVALID', 'Lien de liaison invalide ou expiré.', 400);
    }

    const user = await this.prisma.user.findUnique({ where: { id: claims.userId } });
    if (!user || !user.passwordHash) {
      throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.', 401);
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.', 401);
    }

    const taken = await this.prisma.account.findUnique({
      where: { provider_providerAccountId: { provider: claims.provider, providerAccountId: claims.providerAccountId } },
    });
    if (taken) {
      throw new DomainException('AUTH_ACCOUNT_ALREADY_LINKED', 'Ce compte externe est déjà lié à un utilisateur.', 409);
    }

    await this.prisma.account.create({
      data: { userId: user.id, provider: claims.provider, providerAccountId: claims.providerAccountId },
    });
    return this.generateTokenPair(user);
  }

  private async uniqueUsername(base: string): Promise<string> {
    const clean = base.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'membre';
    const taken = await this.prisma.user.findUnique({ where: { username: clean } });
    return taken ? `${clean}_${Math.floor(Math.random() * 9999)}` : clean;
  }

  // ── Refresh tokens ───────────────────────────────────────────────────

  async refresh(userId: string, oldJti: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainException('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable.', 401);

    // Révoquer l'ancien refresh token (rotation)
    await this.redis.revokeRefreshToken(userId, oldJti);

    return this.generateTokenPair(user);
  }

  // ── Déconnexion ──────────────────────────────────────────────────────

  async logout(userId: string, jti: string): Promise<void> {
    await this.redis.revokeRefreshToken(userId, jti);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.redis.revokeAllRefreshTokens(userId);
  }

  // ── Me ───────────────────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id:          true,
        email:       true,
        username:    true,
        displayName: true,
        avatarUrl:   true,
        role:        true,
        isVerified:  true,
        reputation:  true,
        createdAt:   true,
      },
    });

    if (!user) throw new DomainException('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable.', 401);
    return user;
  }

  // ── OAuth helpers ────────────────────────────────────────────────────


  async generateTokensForOAuthUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new DomainException('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable.', 401);
    return this.generateTokenPair(user);
  }

  // ── Helpers privés ───────────────────────────────────────────────────

  private async generateTokenPair(user: User | SafeUser) {
    const jti = uuidv4();

    const payload: JwtPayload = {
      sub:   user.id,
      email: user.email,
      role:  user.role,
      jti,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret:    this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret:    this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    // Stocker le refresh token dans Redis
    await this.redis.saveRefreshToken(user.id, jti, REFRESH_TTL_S);

    // Mettre à jour lastSeenAt
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
      .catch((e: unknown) => this.logger.warn('Impossible de mettre à jour lastSeenAt', e));

    return { accessToken, refreshToken };
  }
}
