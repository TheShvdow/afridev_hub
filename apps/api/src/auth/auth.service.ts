import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { MailService } from '../mail/mail.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { AuthEmailVerifiedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { Prisma, type User } from '@prisma/client';
import { escapeHtml } from '../mail/escape-html';
import { emailCode, emailNote } from '../mail/email-layout';
import { DomainException } from '../common/errors/domain.exception';
import { isUserBanned } from '../common/moderation/user-ban';

const BCRYPT_ROUNDS = 12;
const REFRESH_TTL_S  = 7 * 24 * 60 * 60;         // 7 jours en secondes
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;  // code de vérification : 24 h
const MAX_VERIFICATION_ATTEMPTS = 5;
// Lettres et chiffres sans les caractères qui se confondent à la lecture (0/O, 1/I).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

export function generateVerificationCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

export const hashCode = (code: string) => createHash('sha256').update(code.toUpperCase()).digest('hex');

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
  // Code à 6 caractères envoyé par email (décision 2026-10-21). Seule son empreinte est
  // stockée ; 5 essais erronés invalident le code, un renvoi en génère un nouveau.

  async verifyEmail(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { isVerified: true } });
    if (!user) throw new DomainException('AUTH_USER_NOT_FOUND', 'Utilisateur introuvable.', 401);
    if (user.isVerified) throw new DomainException('AUTH_ALREADY_VERIFIED', 'Cet email est déjà vérifié.', 409);

    const record = await this.prisma.verificationToken.findFirst({ where: { identifier: userId } });
    if (!record || record.expires.getTime() < Date.now()) {
      throw new DomainException('AUTH_VERIFICATION_TOKEN_INVALID', 'Code invalide ou expiré : demandez-en un nouveau.', 400);
    }

    if (!this.sameHash(record.token, hashCode(code))) {
      const attempts = record.attempts + 1;
      if (attempts >= MAX_VERIFICATION_ATTEMPTS) {
        await this.prisma.verificationToken.deleteMany({ where: { identifier: userId } });
        throw new DomainException(
          'AUTH_VERIFICATION_TOO_MANY_ATTEMPTS',
          'Trop d\'essais : ce code n\'est plus valable, demandez-en un nouveau.',
          429,
        );
      }
      await this.prisma.verificationToken.update({ where: { token: record.token }, data: { attempts } });
      throw new DomainException('AUTH_VERIFICATION_TOKEN_INVALID', 'Code invalide ou expiré : demandez-en un nouveau.', 400);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { isVerified: true } }),
      this.prisma.verificationToken.deleteMany({ where: { identifier: userId } }),
    ]);

    const payload: AuthEmailVerifiedEvent = { userId };
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
    return { message: 'Nouveau code de vérification envoyé.' };
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Un seul code valide à la fois : on remplace les précédents.
    await this.prisma.verificationToken.deleteMany({ where: { identifier: user.id } });
    const code = await this.createUniqueCode(user.id);

    if (process.env['NODE_ENV'] !== 'production') {
      // Sandbox : le code est visible dans les logs pour tester le parcours sans boîte mail.
      this.logger.log(`Code de vérification (sandbox) pour ${user.email} : ${code}`);
    }

    await this.mail.send(
      user.email,
      `${code} est votre code de vérification AfriDev Hub`,
      `<h1 style="margin:0 0 16px;font-size:22px">Confirmez votre adresse email</h1>
       <p>Bonjour ${escapeHtml(user.username)},</p>
       <p>Bienvenue sur AfriDev Hub ! Saisissez ce code dans l'application pour confirmer votre adresse :</p>
       ${emailCode(code)}
       <p>Ce code expire dans 24 heures.</p>
       ${emailNote('Vous n\'avez pas créé de compte ? Ignorez cet email, aucune action ne sera faite.')}`,
    );
  }

  // Code unique parmi les codes en cours : la contrainte d'unicité tranche, on retire en cas de collision.
  private async createUniqueCode(userId: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      const code = generateVerificationCode();
      try {
        await this.prisma.verificationToken.create({
          data: { identifier: userId, token: hashCode(code), expires: new Date(Date.now() + VERIFICATION_TTL_MS) },
        });
        return code;
      } catch (error) {
        const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!collision || attempt >= 4) throw error;
      }
    }
  }

  private sameHash(a: string, b: string): boolean {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    return left.length === right.length && timingSafeEqual(left, right);
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
    // Vérifié après le mot de passe : le statut de bannissement n'est révélé qu'à qui le connaît.
    if (await isUserBanned(this.prisma, user.id)) {
      throw new DomainException('AUTH_ACCOUNT_BANNED', 'Compte suspendu.', 403);
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
      if (await isUserBanned(this.prisma, existing.user.id)) {
        throw new DomainException('AUTH_ACCOUNT_BANNED', 'Compte suspendu.', 403);
      }
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
    if (await isUserBanned(this.prisma, user.id)) {
      throw new DomainException('AUTH_ACCOUNT_BANNED', 'Compte suspendu.', 403);
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

    if (await isUserBanned(this.prisma, user.id)) {
      throw new DomainException('AUTH_ACCOUNT_BANNED', 'Compte suspendu.', 403);
    }

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
        emailNotifications: true,
        isRecruiter: true,
        companyName: true,
        preferredCurrency: true,
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
