import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
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

    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  async update(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
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
      },
    });
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
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

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
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    return this.prisma.userBadge.findMany({
      where:   { userId: user.id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
  }
}
