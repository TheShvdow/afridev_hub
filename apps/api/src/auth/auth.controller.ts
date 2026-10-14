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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/auth-tokens.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshAuthGuard } from './guards/refresh-auth.guard';
import { GithubAuthGuard } from './guards/github-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';

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
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  // ── Connexion ────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // ── Refresh ──────────────────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshAuthGuard)
  @ApiOperation({ summary: 'Renouveler les tokens' })
  async refresh(@CurrentUser() user: JwtPayload & { refreshToken: string }) {
    return this.authService.refresh(user.sub, user.jti!);
  }

  // ── Déconnexion ──────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Se déconnecter (révoque le refresh token)' })
  async logout(@CurrentUser() user: AuthUser, @Body() dto: RefreshTokenDto) {
    if (user.jti) {
      await this.authService.logout(user.id, user.jti);
    }
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Se déconnecter de tous les appareils' })
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.authService.logoutAll(user.id);
  }

  // ── Me ───────────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil de l\'utilisateur connecté' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  // ── GitHub OAuth ─────────────────────────────────────────────────────

  @Get('github')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Démarrer l\'authentification GitHub' })
  githubAuth() {
    // Passport redirige vers GitHub automatiquement
  }

  @Get('github/callback')
  @UseGuards(GithubAuthGuard)
  @ApiOperation({ summary: 'Callback GitHub OAuth' })
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
