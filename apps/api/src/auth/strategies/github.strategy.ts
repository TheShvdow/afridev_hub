import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: config.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email', 'read:user'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ) {
    const email =
      profile.emails?.[0]?.value ??
      `${profile.username}@github.afridevhub.com`;

    const avatarUrl = profile.photos?.[0]?.value ?? null;

    return this.authService.findOrCreateGithubUser({
      githubId: profile.id,
      email,
      username: profile.username ?? `gh_${profile.id}`,
      displayName: profile.displayName ?? profile.username ?? '',
      avatarUrl,
    });
  }
}
