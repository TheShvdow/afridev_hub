import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { ApiData } from '../common/swagger/api-data.decorator';
import { AuthTokensDto, UserMeDto } from './dto/auth-tokens.dto';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  jti?: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ── Inscription ──────────────────────────────────────────────────────

  @Post('register')
  @ApiOperation({ summary: 'Créer un compte' })
  @ApiData({ type: AuthTokensDto, status: 201, description: 'Compte créé, tokens renvoyés' })
  @ApiResponse({ status: 409, description: 'Email ou nom d\'utilisateur déjà utilisé' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── Connexion ────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter' })
  @ApiData({ type: AuthTokensDto, description: 'Tokens d\'accès et de rafraîchissement' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── Refresh ──────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshAuthGuard)
  @ApiOperation({ summary: 'Renouveler les tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiData({ type: AuthTokensDto, description: 'Nouveaux tokens (l\'ancien refresh token est révoqué)' })
  @ApiResponse({ status: 401, description: 'Refresh token manquant, invalide ou révoqué' })
  async refresh(@CurrentUser() user: JwtPayload & { refreshToken: string }) {
    return this.authService.refresh(user.sub, user.jti!);
  }

  // ── Déconnexion ──────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Se déconnecter (révoque le refresh token)' })
  @ApiNoContentResponse({ description: 'Session révoquée' })
  async logout(@CurrentUser() user: AuthUser) {
    if (user.jti) {
      await this.authService.logout(user.id, user.jti);
    }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Se déconnecter de tous les appareils' })
  @ApiNoContentResponse({ description: 'Toutes les sessions révoquées' })
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.authService.logoutAll(user.id);
  }

  // ── Me ───────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  @ApiData({ type: UserMeDto, description: 'Utilisateur connecté' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // ── GitHub OAuth ─────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Démarrer l\'authentification GitHub' })
  @ApiExcludeEndpoint()
  githubAuth() {
    // Passport redirige vers GitHub automatiquement
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Callback GitHub OAuth' })
  @ApiExcludeEndpoint()
  async githubCallback(
    @Req() req: Request & { user: AuthUser },
    @Res() res: Response,
  ) {
    const tokens = await this.authService.generateTokensForOAuthUser(req.user.id);
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');

    // Rediriger vers le front avec les tokens dans le hash (#)
    // Le front lit l'URL et les stocke
    const redirectUrl = new URL('/auth/github/callback', webUrl);
    redirectUrl.searchParams.set('at', tokens.accessToken);
    redirectUrl.searchParams.set('rt', tokens.refreshToken);

    res.redirect(redirectUrl.toString());
  }
}
