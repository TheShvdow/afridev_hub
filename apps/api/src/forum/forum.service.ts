import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { ListPostsDto } from './dto/list-posts.dto';

@Injectable()
export class ForumService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Posts ────────────────────────────────────────────────────────────

  async listPosts(dto: ListPostsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: Parameters<typeof this.prisma.post.findMany>[0]['where'] = {};

    if (dto.tag) {
      where.postTags = { some: { tag: { name: dto.tag } } };
    }

    if (dto.search) {
      where.OR = [
        { title: { contains: dto.search, mode: 'insensitive' } },
        { body:  { contains: dto.search, mode: 'insensitive' } },
      ];
    }

    if (dto.sort === 'unanswered') {
      where.answers = { none: {} };
    }

    // No voteScore or lastActivityAt fields — always sort by createdAt
    const orderBy: Parameters<typeof this.prisma.post.findMany>[0]['orderBy'] =
      { createdAt: 'desc' };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy,
        skip,
        take:    limit,
        select: {
          id:        true,
          title:     true,
          viewCount: true,
          isResolved:true,
          createdAt: true,
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
          },
          postTags: {
            select: { tag: { select: { name: true, slug: true } } },
          },
          _count: { select: { answers: true } },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPost(id: string, viewerId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true, role: true },
        },
        postTags: { include: { tag: true } },
        answers: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
            },
          },
          orderBy: [{ isAccepted: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!post) throw new NotFoundException('Question introuvable.');

    // Incrémenter les vues (fire and forget)
    this.prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => null);

    return post;
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.post.create({
      data: {
        title:  dto.title,
        body:   dto.body,
        userId,
        postTags: dto.tags?.length
          ? {
              create: await Promise.all(
                dto.tags.map(async (tagName) => {
                  const tagSlug = tagName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                  const tag = await this.prisma.tag.upsert({
                    where:  { slug: tagSlug },
                    update: { usageCount: { increment: 1 } },
                    create: { name: tagName, slug: tagSlug, usageCount: 1 },
                  });
                  return { tagId: tag.id };
                }),
              ),
            }
          : undefined,
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        postTags: { include: { tag: true } },
      },
    });

    return post;
  }

  async updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Question introuvable.');
    if (post.userId !== userId) throw new ForbiddenException('Non autorisé.');

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.body  && { body: dto.body }),
      },
    });
  }

  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Question introuvable.');

    if (post.userId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('Non autorisé.');
    }

    await this.prisma.post.delete({ where: { id: postId } });
  }

  // ── Answers ──────────────────────────────────────────────────────────

  async createAnswer(postId: string, userId: string, dto: CreateAnswerDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Question introuvable.');

    const answer = await this.prisma.answer.create({
      data: { body: dto.body, postId, userId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
        },
      },
    });

    return answer;
  }

  async acceptAnswer(answerId: string, userId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      include: { post: true },
    });

    if (!answer) throw new NotFoundException('Réponse introuvable.');
    if (answer.post.userId !== userId) {
      throw new ForbiddenException('Seul l\'auteur peut accepter une réponse.');
    }

    await this.prisma.$transaction([
      // Désaccepter toute réponse déjà acceptée
      this.prisma.answer.updateMany({
        where: { postId: answer.postId, isAccepted: true },
        data:  { isAccepted: false },
      }),
      this.prisma.answer.update({
        where: { id: answerId },
        data:  { isAccepted: true },
      }),
      this.prisma.post.update({
        where: { id: answer.postId },
        data:  { isResolved: true },
      }),
    ]);

    return { success: true };
  }

  async deleteAnswer(answerId: string, userId: string, userRole: string) {
    const answer = await this.prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer) throw new NotFoundException('Réponse introuvable.');

    if (answer.userId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('Non autorisé.');
    }

    await this.prisma.answer.delete({ where: { id: answerId } });
  }
}
