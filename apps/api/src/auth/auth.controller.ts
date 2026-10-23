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
  Head,
  UseFilters,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiNoContentResponse, ApiResponse, ApiExcludeEndpoint, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { OAuthCallbackFilter } from './filters/oauth-callback.filter';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ResendVerificationDto, VerifyEmailDto } from './dto/verify-email.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { OAuthLinkDto } from './dto/oauth-link.dto';
import type { OAuthLoginResult } from './auth.service';
import { OAUTH_DOCS_PATH, takeOAuthReturn } from './oauth-return';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { ApiData } from '../common/swagger/api-data.decorator';
import { AuthTokensDto, UserMeDto } from './dto/auth-tokens.dto';
import { MessageDto, RegisteredDto } from '../common/swagger/models-extra';

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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Créer un compte',
    description: 'Aucun token : un code est envoyé par email, à confirmer avec POST /auth/verify-email avant de se connecter.',
  })
  @ApiData({ type: RegisteredDto, status: 201, description: 'Compte créé, en attente de vérification' })
  @ApiResponse({ status: 409, description: 'Email ou nom d\'utilisateur déjà utilisé' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── Connexion ────────────────────────────────────────────────────────

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter' })
  @ApiData({ type: AuthTokensDto, description: 'Tokens d\'accès et de rafraîchissement' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  @ApiResponse({ status: 403, description: 'AUTH_EMAIL_NOT_VERIFIED : email pas encore confirmé (ou compte suspendu)' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── Refresh ──────────────────────────────────────────────────────────

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmer son adresse email avec le code à 6 caractères reçu',
    description: 'Sans token : étape entre l\'inscription et la première connexion.',
  })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  @ApiResponse({ status: 409, description: 'Email déjà vérifié' })
  @ApiResponse({ status: 429, description: '5 essais erronés : le code est invalidé, en demander un nouveau' })
  @ApiData({ type: MessageDto, description: 'Email vérifié : l\'utilisateur peut se connecter' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.email, dto.code);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recevoir un nouveau code de vérification par email',
    description: 'Réponse identique que l\'email ait un compte ou non.',
  })
  @ApiData({ type: MessageDto, description: 'Nouveau code envoyé si un compte non vérifié utilise cet email' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  // ── GitHub OAuth ─────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({
    summary: 'Se connecter avec GitHub',
    description:
      'À ouvrir dans le navigateur, pas avec « Try it out » : la page redirige vers GitHub. ' +
      'Depuis cette doc : [Se connecter avec GitHub](/api/auth/github?redirect=docs). ' +
      'Au retour, le token est placé dans « Authorize ».',
  })
  @ApiQuery({ name: 'redirect', required: false, enum: ['docs'], description: 'docs : revenir sur Swagger au lieu du front' })
  @ApiResponse({ status: 302, description: 'Redirection vers GitHub' })
  githubAuth() {
    // Passport redirige vers GitHub automatiquement
  }

  // Express sert aussi HEAD avec la route GET : sans cette route dédiée, une requête HEAD
  // (préchargement du navigateur, sonde) consommerait le code à usage unique de GitHub.
  // Déclarée avant le GET pour être appariée en premier.
  @Head(['github/callback', 'google/callback'])
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiExcludeEndpoint()
  oauthCallbackHead() {
    // Rien à faire : le code OAuth n'est utilisé que par la requête GET.
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @UseFilters(OAuthCallbackFilter)
  @ApiOperation({ summary: 'Callback GitHub OAuth' })
  @ApiExcludeEndpoint()
  githubCallback(@Req() req: Request & { user: OAuthLoginResult }, @Res() res: Response) {
    this.redirectAfterOAuth(req, res, 'github', req.user);
  }

  // ── Google OAuth ─────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Se connecter avec Google',
    description:
      'À ouvrir dans le navigateur, pas avec « Try it out » : la page redirige vers Google. ' +
      'Depuis cette doc : [Se connecter avec Google](/api/auth/google?redirect=docs). ' +
      'Au retour, le token est placé dans « Authorize ».',
  })
  @ApiQuery({ name: 'redirect', required: false, enum: ['docs'], description: 'docs : revenir sur Swagger au lieu du front' })
  @ApiResponse({ status: 302, description: 'Redirection vers Google' })
  googleAuth() {
    // Passport redirige vers Google automatiquement
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @UseFilters(OAuthCallbackFilter)
  @ApiOperation({ summary: 'Callback Google OAuth' })
  @ApiExcludeEndpoint()
  googleCallback(@Req() req: Request & { user: OAuthLoginResult }, @Res() res: Response) {
    this.redirectAfterOAuth(req, res, 'google', req.user);
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
  // Une connexion lancée depuis Swagger revient sur la doc, qui place le token dans « Authorize ».
  private redirectAfterOAuth(req: Request, res: Response, provider: 'github' | 'google', result: OAuthLoginResult) {
    const toDocs = takeOAuthReturn(req, res);
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');

    if (result.type === 'link') {
      const hash = new URLSearchParams({ provider, linkToken: result.linkToken, email: result.email }).toString();
      res.redirect(toDocs ? `${OAUTH_DOCS_PATH}#${hash}` : `${new URL('/auth/oauth/link', webUrl)}#${hash}`);
      return;
    }

    const hash = new URLSearchParams({ at: result.tokens.accessToken, rt: result.tokens.refreshToken }).toString();
    res.redirect(toDocs ? `${OAUTH_DOCS_PATH}#${hash}` : `${new URL(`/auth/${provider}/callback`, webUrl)}#${hash}`);
  }
}
