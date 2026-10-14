import {
  Injectable,
  } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { DomainException } from '../common/errors/domain.exception';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { OnboardingDto } from './dto/onboarding.dto';
import type { UsersProfileUpdatedEvent } from '@afridev/shared-types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly config: ConfigService,
  ) {}

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id:              true,
        username:        true,
        displayName:     true,
        bio:             true,
        avatarUrl:       true,
        location:        true,
        websiteUrl:      true,
        githubUsername:  true,
        linkedinUsername:true,
        twitterUsername: true,
        reputation:      true,
        role:            true,
        isVerified:      true,
        createdAt:       true,
        _count: {
          select: {
            posts:           true,
            answers:         true,
            projects:        true,
            receivedBadges:  true,
          },
        },
      },
    });

    if (!user) throw new DomainException('USERS_USER_NOT_FOUND', 'Utilisateur introuvable.', 404);
    return { ...user, ogMeta: this.buildOgMeta(user) };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id:              true,
        username:        true,
        displayName:     true,
        bio:             true,
        avatarUrl:       true,
        location:        true,
        websiteUrl:      true,
        githubUsername:  true,
        linkedinUsername:true,
        twitterUsername: true,
        reputation:      true,
        role:            true,
        isVerified:      true,
        createdAt:       true,
      },
    });

    if (!user) throw new DomainException('USERS_USER_NOT_FOUND', 'Utilisateur introuvable.', 404);
    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      select: {
        id:              true,
        username:        true,
        displayName:     true,
        bio:             true,
        avatarUrl:       true,
        location:        true,
        country:         true,
        stack:           true,
        level:           true,
        websiteUrl:      true,
        githubUsername:  true,
        linkedinUsername:true,
        twitterUsername: true,
        reputation:      true,
        role:            true,
        isVerified:      true,
      },
    });

    this.emitProfileUpdated(userId);
    return user;
  }

  // Onboarding (E2-4) : un champ déjà renseigné n'est jamais écrasé.
  async completeOnboarding(userId: string, dto: OnboardingDto) {
    const current = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { location: true, country: true, stack: true, level: true },
    });
    if (!current) throw new DomainException('USERS_USER_NOT_FOUND', 'Utilisateur introuvable.', 404);

    const data = {
      ...(!current.location && dto.location && { location: dto.location }),
      ...(!current.country && dto.country && { country: dto.country }),
      ...(current.stack.length === 0 && dto.stack?.length && { stack: dto.stack }),
      ...(!current.level && dto.level && { level: dto.level }),
    };

    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, location: true, country: true, stack: true, level: true },
    });
    this.emitProfileUpdated(userId);
    return user;
  }

  // Métadonnées Open Graph du profil public (story E2-9) : consommées par les crawlers et le SSR.
  private buildOgMeta(user: { username: string; displayName: string | null; bio: string | null; avatarUrl: string | null }) {
    const webUrl = this.config.get<string>('WEB_URL', 'http://localhost:4200');
    const name = user.displayName?.trim() || user.username;
    const description = (user.bio?.trim() || `Profil de ${name} sur AfriDev Hub`).slice(0, 160);
    return {
      ogTitle:       `${name} — AfriDev Hub`,
      ogDescription: description,
      ogImage:       user.avatarUrl,
      ogUrl:         `${webUrl}/@${user.username}`,
    };
  }

  private emitProfileUpdated(userId: string) {
    const payload: UsersProfileUpdatedEvent = { userId };
    this.events.emit('users.profile.updated', payload);
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: { id: true, avatarUrl: true },
    });
  }

  async getActivity(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new DomainException('USERS_USER_NOT_FOUND', 'Utilisateur introuvable.', 404);

    const [recentPosts, recentAnswers, recentProjects] = await Promise.all([
      this.prisma.post.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take:    5,
        select:  { id: true, title: true, createdAt: true, viewCount: true },
      }),
      this.prisma.answer.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take:    5,
        select:  {
          id: true, createdAt: true, isAccepted: true,
          post: { select: { id: true, title: true } },
        },
      }),
      this.prisma.project.findMany({
        where:   { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take:    5,
        select:  { id: true, name: true, createdAt: true, isApproved: true },
      }),
    ]);

    return { recentPosts, recentAnswers, recentProjects };
  }

  async getBadges(username: string) {
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) throw new DomainException('USERS_USER_NOT_FOUND', 'Utilisateur introuvable.', 404);

    return this.prisma.userBadge.findMany({
      where:   { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
  }
}
