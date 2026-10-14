import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import type { User } from '@prisma/client';

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL_MS  = 15 * 60 * 1000;           // 15 min
const REFRESH_TTL_S  = 7 * 24 * 60 * 60;         // 7 jours en secondes

type SafeUser = Omit<User, 'passwordHash'>;

interface GithubUserInput {
  githubId: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Inscription ─────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException('Cet email est déjà utilisé.');
      }
      throw new ConflictException('Ce nom d\'utilisateur est déjà pris.');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email:        dto.email,
        username:     dto.username,
        passwordHash,
      },
    });

    return this.generateTokenPair(user);
  }

  // ── Connexion ────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    return this.generateTokenPair(user);
  }

  // ── GitHub OAuth ─────────────────────────────────────────────────────

  async findOrCreateGithubUser(input: GithubUserInput): Promise<SafeUser> {
    // Chercher d'abord via la table Account
    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider:          'github',
          providerAccountId: input.githubId,
        },
      },
      include: { user: true },
    });

    if (account) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash: _, ...safeUser } = account.user;
      return safeUser as SafeUser;
    }

    // Aucun compte GitHub trouvé — chercher par email
    let user = await this.prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      // Créer un nouveau compte
      let username = input.username;
      const usernameExists = await this.prisma.user.findUnique({ where: { username } });
      if (usernameExists) {
        username = `${username}_${Math.floor(Math.random() * 9999)}`;
      }
      user = await this.prisma.user.create({
        data: {
          email:       input.email,
          username,
          displayName: input.displayName,
          avatarUrl:   input.avatarUrl ?? null,
          isVerified:  true, // GitHub a déjà vérifié l'email
        },
      });
    } else {
      // Mettre à jour le profil si des champs sont manquants
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl:   user.avatarUrl   ?? input.avatarUrl   ?? null,
          displayName: user.displayName ?? input.displayName ?? null,
        },
      });
    }

    // Lier le compte GitHub
    await this.prisma.account.create({
      data: {
        userId:            user.id,
        provider:          'github',
        providerAccountId: input.githubId,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...safeUser } = user;
    return safeUser as SafeUser;
  }

  // ── Refresh tokens ───────────────────────────────────────────────────

  async refresh(userId: string, oldJti: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');

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

    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');
    return user;
  }

  // ── OAuth helpers ────────────────────────────────────────────────────

  async generateTokensForOAuthUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Utilisateur introuvable.');
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
