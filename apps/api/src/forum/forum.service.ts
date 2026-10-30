import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ForumQuestionCreatedEvent, ForumAnswerCreatedEvent, ForumAnswerAcceptedEvent } from '@afridev/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { resolveTagIds } from '../common/tags/resolve-tags';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { ListPostsDto } from './dto/list-posts.dto';
import { Prisma } from '@prisma/client';
import { DomainException } from '../common/errors/domain.exception';

// Texte affiché à la place d'un contenu masqué par la modération (FR-21).
export const HIDDEN_CONTENT = '[Contenu masqué]';

// FR-14 : seuil de similarité trigramme pour proposer une question existante.
const SIMILAR_MIN_SIMILARITY = 0.6;
const SIMILAR_MAX_RESULTS = 3;

const MODERATOR_ROLES = new Set(['ADMIN', 'MODERATOR']);

export interface ForumViewer {
  id:   string;
  role: string;
}

const LIST_SELECT = {
  id:             true,
  title:          true,
  viewCount:      true,
  isResolved:     true,
  voteScore:      true,
  lastActivityAt: true,
  createdAt:      true,
  user: {
    select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
  },
  postTags: {
    select: { tag: { select: { name: true, slug: true } } },
  },
  _count: { select: { answers: true } },
} satisfies Prisma.PostSelect;

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

    if (dto.search?.trim()) {
      return this.searchPosts(dto.search.trim(), dto, page, limit, skip);
    }

    const where: Prisma.PostWhereInput = { isHidden: false };

    if (dto.tag) {
      where.postTags = { some: { tag: { name: dto.tag } } };
    }

    if (dto.sort === 'unanswered') {
      where.answers = { none: {} };
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: this.orderBy(dto.sort),
        skip,
        take:    limit,
        select:  LIST_SELECT,
      }),
      this.prisma.post.count({ where }),
    ]);

    return { data: posts, meta: this.meta(total, page, limit) };
  }

  // FR-19 : recherche plein texte (français, accents ignorés), triée par pertinence
  // sauf si le tri « votes » ou « active » est demandé explicitement.
  private async searchPosts(search: string, dto: ListPostsDto, page: number, limit: number, skip: number) {
    const document = Prisma.sql`to_tsvector('french', f_unaccent(p."title" || ' ' || p."body"))`;
    const query    = Prisma.sql`websearch_to_tsquery('french', f_unaccent(${search}))`;

    const filters: Prisma.Sql[] = [Prisma.sql`p."isHidden" = false`, Prisma.sql`${document} @@ ${query}`];
    if (dto.tag) {
      filters.push(Prisma.sql`EXISTS (
        SELECT 1 FROM "PostTag" pt JOIN "Tag" t ON t."id" = pt."tagId"
        WHERE pt."postId" = p."id" AND t."name" = ${dto.tag})`);
    }
    if (dto.sort === 'unanswered') {
      filters.push(Prisma.sql`NOT EXISTS (SELECT 1 FROM "Answer" a WHERE a."postId" = p."id")`);
    }
    const where = Prisma.join(filters, ' AND ');

    let order = Prisma.sql`ts_rank(${document}, ${query}) DESC, p."createdAt" DESC`;
    if (dto.sort === 'votes')  order = Prisma.sql`p."voteScore" DESC, p."createdAt" DESC`;
    if (dto.sort === 'active') order = Prisma.sql`p."lastActivityAt" DESC`;

    const [rows, [{ count }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p."id" FROM "Post" p WHERE ${where}
        ORDER BY ${order} LIMIT ${limit} OFFSET ${skip}`,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint AS count FROM "Post" p WHERE ${where}`,
    ]);

    const ids = rows.map((row) => row.id);
    const posts = ids.length
      ? await this.prisma.post.findMany({ where: { id: { in: ids } }, select: LIST_SELECT })
      : [];
    const byId = new Map(posts.map((post) => [post.id, post]));
    const ordered = ids.map((id) => byId.get(id)).filter((post) => post !== undefined);

    return { data: ordered, meta: this.meta(Number(count), page, limit) };
  }

  // FR-14 : questions au titre proche, proposées avant de publier.
  findSimilar(title: string) {
    return this.prisma.$queryRaw<{ id: string; title: string; isResolved: boolean; similarity: number }[]>`
      SELECT p."id", p."title", p."isResolved",
             similarity(lower(f_unaccent(p."title")), lower(f_unaccent(${title})))::float AS similarity
      FROM "Post" p
      WHERE p."isHidden" = false
        AND lower(f_unaccent(p."title")) % lower(f_unaccent(${title}))
        AND similarity(lower(f_unaccent(p."title")), lower(f_unaccent(${title}))) >= ${SIMILAR_MIN_SIMILARITY}
      ORDER BY similarity DESC
      LIMIT ${SIMILAR_MAX_RESULTS}`;
  }

  async getPost(id: string, viewer?: ForumViewer | null) {
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
          orderBy: [{ isAccepted: 'desc' }, { voteScore: 'desc' }, { createdAt: 'asc' }],
        },
      },
    });

    if (!post) throw new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404);

    // Incrémenter les vues (fire and forget)
    this.prisma.post
      .update({ where: { id: post.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => null);

    // La modération voit le contenu masqué ; les autres voient le texte de remplacement.
    const visible = viewer && MODERATOR_ROLES.has(viewer.role)
      ? post
      : {
          ...post,
          ...(post.isHidden && { title: HIDDEN_CONTENT, body: HIDDEN_CONTENT }),
          answers: post.answers.map((answer) =>
            answer.isHidden ? { ...answer, body: HIDDEN_CONTENT } : answer,
          ),
        };

    // Vote du visiteur connecté sur la question et chaque réponse : le front l'affiche et calcule
    // le nouveau score sans attendre l'API (null pour un visiteur ou en l'absence de vote).
    const votes = viewer ? await this.viewerVotes(viewer.id, post.id, post.answers.map((answer) => answer.id)) : null;

    return {
      ...visible,
      userVote: votes?.get(post.id) ?? null,
      answers: visible.answers.map((answer) => ({ ...answer, userVote: votes?.get(answer.id) ?? null })),
    };
  }

  private async viewerVotes(userId: string, postId: string, answerIds: string[]) {
    const votes = await this.prisma.vote.findMany({
      where: {
        userId,
        OR: [
          { entityType: 'POST', entityId: postId },
          ...(answerIds.length ? [{ entityType: 'ANSWER' as const, entityId: { in: answerIds } }] : []),
        ],
      },
      select: { entityId: true, value: true },
    });
    return new Map(votes.map((vote) => [vote.entityId, vote.value] as const));
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

    return this.prisma.$transaction(
      async (tx) => {
        if (dto.tags) {
          // Les anciens tags perdent un usage, les nouveaux en gagnent un (resolveTagIds).
          const previous = await tx.postTag.findMany({ where: { postId }, select: { tagId: true } });
          await tx.tag.updateMany({
            where: { id: { in: previous.map((link) => link.tagId) } },
            data:  { usageCount: { decrement: 1 } },
          });
          await tx.postTag.deleteMany({ where: { postId } });
          const tagIds = await resolveTagIds(tx, dto.tags);
          await tx.postTag.createMany({ data: tagIds.map((tagId) => ({ postId, tagId })) });
        }

        return tx.post.update({
          where: { id: postId },
          data: {
            ...(dto.title && { title: dto.title }),
            ...(dto.body  && { body: dto.body }),
            lastActivityAt: new Date(),
          },
          include: { postTags: { include: { tag: true } } },
        });
      },
      { timeout: 15000 },
    );
  }

  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new DomainException('FORUM_QUESTION_NOT_FOUND', 'Question introuvable.', 404);

    if (post.userId !== userId && !MODERATOR_ROLES.has(userRole)) {
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

    const [answer] = await this.prisma.$transaction([
      this.prisma.answer.create({
        data: { body: dto.body, postId, userId },
        include: {
          user: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, reputation: true },
          },
        },
      }),
      this.prisma.post.update({ where: { id: postId }, data: { lastActivityAt: new Date() } }),
    ]);

    const answerEvent: ForumAnswerCreatedEvent = {
      authorId:     userId,
      answerId:     answer.id,
      postId,
      postAuthorId: post.userId,
    };
    this.events.emit('forum.answer.created', answerEvent);

    return answer;
  }

  async updateAnswer(answerId: string, userId: string, dto: Partial<CreateAnswerDto>) {
    const answer = await this.prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer) throw new DomainException('FORUM_ANSWER_NOT_FOUND', 'Réponse introuvable.', 404);
    if (answer.userId !== userId) {
      throw new DomainException('FORUM_ANSWER_FORBIDDEN', 'Seul l\'auteur peut modifier sa réponse.', 403);
    }

    return this.prisma.answer.update({
      where: { id: answerId },
      data:  { ...(dto.body && { body: dto.body }) },
    });
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
        data:  { isResolved: true, lastActivityAt: new Date() },
      }),
    ]);

    const acceptedEvent: ForumAnswerAcceptedEvent = {
      answerAuthorId: answer.userId,
      answerId,
      postId:         answer.postId,
      acceptedById:   userId,
    };
    this.events.emit('forum.answer.accepted', acceptedEvent);

    return { success: true };
  }

  async deleteAnswer(answerId: string, userId: string, userRole: string) {
    const answer = await this.prisma.answer.findUnique({ where: { id: answerId } });
    if (!answer) throw new DomainException('FORUM_ANSWER_NOT_FOUND', 'Réponse introuvable.', 404);

    if (answer.userId !== userId && !MODERATOR_ROLES.has(userRole)) {
      throw new DomainException('FORUM_FORBIDDEN', 'Non autorisé.', 403);
    }

    await this.prisma.answer.delete({ where: { id: answerId } });
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private orderBy(sort: ListPostsDto['sort']): Prisma.PostOrderByWithRelationInput[] {
    switch (sort) {
      case 'votes':  return [{ voteScore: 'desc' }, { createdAt: 'desc' }];
      case 'active': return [{ lastActivityAt: 'desc' }];
      default:       return [{ createdAt: 'desc' }];
    }
  }

  private meta(total: number, page: number, limit: number) {
    return { total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
