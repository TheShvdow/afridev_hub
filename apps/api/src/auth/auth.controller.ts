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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiResponse, ApiExcludeEndpoint, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthLinkDto } from './dto/oauth-link.dto';
import type { OAuthLoginResult } from './auth.service';
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

  // ── Vérification email ───────────────────────────────────────────────

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmer son adresse email avec le lien reçu' })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({ status: 200, description: 'Email vérifié' })
  @ApiResponse({ status: 400, description: 'Lien invalide ou expiré' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Renvoyer l\'email de vérification' })
  @ApiResponse({ status: 409, description: 'Email déjà vérifié' })
  resendVerification(@CurrentUser('id') userId: string) {
    return this.authService.resendVerification(userId);
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
  githubCallback(@Req() req: Request & { user: OAuthLoginResult }, @Res() res: Response) {
    this.redirectAfterOAuth(res, 'github', req.user);
  }

  // ── Google OAuth ─────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Démarrer l\'authentification Google' })
  @ApiExcludeEndpoint()
  googleAuth() {
    // Passport redirige vers Google automatiquement
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback Google OAuth' })
  @ApiExcludeEndpoint()
  googleCallback(@Req() req: Request & { user: OAuthLoginResult }, @Res() res: Response) {
    this.redirectAfterOAuth(res, 'google', req.user);
  }

  // Confirmation de la liaison d'un compte OAuth à un compte existant (mot de passe requis).
  @Post('oauth/link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lier un compte GitHub ou Google à mon compte existant' })
  @ApiData({ type: AuthTokensDto, description: 'Compte lié, tokens renvoyés' })
  linkOAuth(@Body() dto: OAuthLinkDto) {
    return this.authService.linkOAuthAccount(dto.linkToken, dto.password);
  }

  // Les tokens partent dans le fragment (#), jamais dans la query : ils n'apparaissent ni dans les logs ni dans l'historique serveur.
  private redirectAfterOAuth(res: Response, provider: 'github' | 'google', result: OAuthLoginResult) {
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');

    if (result.type === 'link') {
      const url = new URL(`/auth/oauth/link`, webUrl);
      url.hash = new URLSearchParams({ provider, linkToken: result.linkToken, email: result.email }).toString();
      res.redirect(url.toString());
      return;
    }

    const url = new URL(`/auth/${provider}/callback`, webUrl);
    url.hash = new URLSearchParams({ at: result.tokens.accessToken, rt: result.tokens.refreshToken }).toString();
    res.redirect(url.toString());
  }
}
