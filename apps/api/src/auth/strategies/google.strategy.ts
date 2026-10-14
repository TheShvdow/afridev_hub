import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { DomainException } from '../../common/errors/domain.exception';

// Sans identifiants, la stratégie reste construite (l'application démarre) ;
// le garde refuse la route avec 503 tant que GOOGLE_CLIENT_ID est absent.
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID:     config.get<string>('GOOGLE_CLIENT_ID') || 'not-configured',
      clientSecret: config.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured',
      callbackURL:  config.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/auth/google/callback',
      scope:        ['email', 'profile'],
    });
  }

  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new DomainException('AUTH_OAUTH_EMAIL_MISSING', 'Google n\'a pas transmis d\'adresse email.', 400);
    }

    const emailVerified = Boolean((profile._json as { email_verified?: boolean } | undefined)?.email_verified);

    return this.authService.resolveOAuthLogin({
      provider:          'google',
      providerAccountId: profile.id,
      email,
      emailVerified,
      username:    email.split('@')[0],
      displayName: profile.displayName ?? '',
      avatarUrl:   profile.photos?.[0]?.value ?? null,
    });
  }
}
