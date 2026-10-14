import {
  Injectable,
  } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ForumQuestionCreatedEvent, ForumAnswerCreatedEvent, ForumAnswerAcceptedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTagIds } from '../common/tags/resolve-tags';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { Prisma } from '@prisma/client';
import { DomainException } from '../common/errors/domain.exception';

@Injectable()
export class ForumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  // ── Posts ────────────────────────────────────────────────────────────

  async listPosts(dto: ListPostsDto) {
    const page  = dto.page  ?? 1;
    const limit = dto.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where: Prisma.PostWhereInput = {};

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
    const orderBy: Prisma.PostOrderByWithRelationInput = { createdAt: 'desc' };

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

  async getPost(id: string, _viewerId?: string) {
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

    if (!post) throw new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404);

    // Incrémenter les vues (fire and forget)
    this.prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => null);

    return post;
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const post = await this.prisma.$transaction(
      async (tx) => {
        const tagIds = await resolveTagIds(tx, dto.tags);
        return tx.post.create({
          data: {
            title:    dto.title,
            body:     dto.body,
            userId,
            postTags: { create: tagIds.map((tagId) => ({ tagId })) },
          },
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true },
            },
            postTags: { include: { tag: true } },
          },
        });
      },
      { timeout: 15000 }, // Neon distant : plusieurs allers-retours, marge au timeout par défaut (5 s)
    );

    const questionEvent: ForumQuestionCreatedEvent = { authorId: userId, postId: post.id };
    this.events.emit('forum.question.created', questionEvent);

    return post;
  }

  async updatePost(postId: string, userId: string, dto: Partial<CreatePostDto>) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404);
    if (post.userId !== userId) throw new DomainException('FORUM_FORBIDDEN', 'Non autorisé.', 403);

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
    if (!post) throw new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404);

    if (post.userId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new DomainException('FORUM_FORBIDDEN', 'Non autorisé.', 403);
    }

    await this.prisma.post.delete({ where: { id: postId } });
  }

  // ── Answers ──────────────────────────────────────────────────────────

  async createAnswer(postId: string, userId: string, dto: CreateAnswerDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404);
    // Glossaire « Réponse » : l'auteur d'une question ne peut pas y répondre.
    if (post.userId === userId) {
      throw new DomainException('FORUM_SELF_ANSWER_FORBIDDEN', 'Vous ne pouvez pas répondre à votre propre question.', 403);
    }

    const answer = await this.prisma.answer.create({
      data: { body: dto.body, postId, userId },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
        },
      },
    });

    const answerEvent: ForumAnswerCreatedEvent = { authorId: userId, answerId: answer.id, postId };
    this.events.emit('forum.answer.created', answerEvent);

    return answer;
  }

  async acceptAnswer(answerId: string, userId: string) {
    const answer = await this.prisma.answer.findUnique({
      where: { id: answerId },
      include: { post: true },
    });

    if (!answer) throw new DomainException('FORUM_ANSWER_NOT_FOUND', 'Réponse introuvable.', 404);
    if (answer.post.userId !== userId) {
      throw new DomainException('FORUM_ANSWER_ACCEPT_FORBIDDEN', 'Seul l\'auteur peut accepter une réponse.', 403);
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

    const acceptedEvent: ForumAnswerAcceptedEvent = {
      answerAuthorId: answer.userId,
      answerId,
      postId: answer.postId,
    };
    this.events.emit('forum.answer.accepted', acceptedEvent);

    return { success: true };
  }

  async deleteAnswer(answerId: string, userId: string, userRole: string) {
    const answer = await this.prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer) throw new DomainException('FORUM_ANSWER_NOT_FOUND', 'Réponse introuvable.', 404);

    if (answer.userId !== userId && !['ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new DomainException('FORUM_FORBIDDEN', 'Non autorisé.', 403);
    }

    await this.prisma.answer.delete({ where: { id: answerId } });
  }
}
