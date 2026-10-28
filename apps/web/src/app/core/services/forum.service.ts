import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { VoteValue } from './votes.service';
import { environment } from '../../../environments/environment';

export type ForumSort = 'newest' | 'votes' | 'unanswered' | 'active';

export interface ForumAuthorSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputation: number;
}

export interface ForumTagLink {
  tag: { name: string; slug: string };
}

/** Réponse de `GET /api/forum/posts` (aucun `body` dans la liste). */
export interface ForumPost {
  id: string;
  title: string;
  viewCount: number;
  isResolved: boolean;
  voteScore: number;
  lastActivityAt: string;
  createdAt: string;
  user: ForumAuthorSummary;
  postTags: ForumTagLink[];
  _count: { answers: number };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ListPostsQuery {
  page?: number;
  limit?: number;
  sort?: ForumSort;
  tag?: string;
  search?: string;
}

export interface CreatePostDto {
  title: string;
  body: string;
  tags: string[];
}

export interface UpdatePostDto {
  title?: string;
  body?: string;
  tags?: string[];
}

export interface CreateAnswerDto {
  body: string;
}

export interface ForumAnswerCreated extends ForumAnswer {}

export interface SimilarPost {
  id: string;
  title: string;
  isResolved: boolean;
  similarity: number;
}

export interface ForumAnswer {
  id: string;
  body: string;
  isAccepted: boolean;
  voteScore: number;
  /** Vote du membre connecté, absent ou null sans vote. */
  userVote?: VoteValue | null;
  isHidden: boolean;
  createdAt: string;
  user: ForumAuthorSummary;
}

/** Réponse de `GET /api/forum/posts/{id}` : la question avec ses réponses. */
export interface ForumPostDetail extends ForumPost {
  userId: string;
  userVote?: VoteValue | null;
  body: string;
  isHidden: boolean;
  updatedAt: string;
  answers: ForumAnswer[];
}

/**
 * `GET /api/forum/posts` renvoie `{ data, meta }` : l'enveloppe paginée est
 * conservée par `envelopeInterceptor`, `meta` porte la pagination.
 */
@Injectable({ providedIn: 'root' })
export class ForumService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/forum`;

  listPosts(query: ListPostsQuery = {}): Observable<Paginated<ForumPost>> {
    let params = new HttpParams();

    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.limit !== undefined) params = params.set('limit', query.limit);
    if (query.sort !== undefined) params = params.set('sort', query.sort);
    if (query.tag) params = params.set('tag', query.tag);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<Paginated<ForumPost>>(`${this.base}/posts`, { params });
  }

  /** `GET /api/forum/posts/{id}` — question et ses réponses. */
  getPost(id: string): Observable<ForumPostDetail> {
    return this.http.get<ForumPostDetail>(`${this.base}/posts/${encodeURIComponent(id)}`);
  }

  /** `GET /api/forum/posts/similar` — 3 questions au titre proche au plus. */
  findSimilar(title: string): Observable<SimilarPost[]> {
    const params = new HttpParams().set('title', title);
    return this.http.get<SimilarPost[]>(`${this.base}/posts/similar`, { params });
  }

  /** `POST /api/forum/posts` — nécessite un jeton d'accès valide. */
  createPost(dto: CreatePostDto): Observable<ForumPost> {
    return this.http.post<ForumPost>(`${this.base}/posts`, dto);
  }

  /** `PATCH /api/forum/posts/{id}` — réservé à l'auteur de la question. */
  updatePost(id: string, dto: UpdatePostDto): Observable<ForumPost> {
    return this.http.patch<ForumPost>(
      `${this.base}/posts/${encodeURIComponent(id)}`,
      dto,
    );
  }

  /** `DELETE /api/forum/posts/{id}` — auteur ou modérateur. */
  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/posts/${encodeURIComponent(id)}`);
  }

  /** `POST /api/forum/posts/{postId}/answers` — répondre à une question. */
  createAnswer(postId: string, dto: CreateAnswerDto): Observable<ForumAnswer> {
    return this.http.post<ForumAnswer>(
      `${this.base}/posts/${encodeURIComponent(postId)}/answers`,
      dto,
    );
  }

  /** `PATCH /api/forum/answers/{answerId}` — réservé à l'auteur de la réponse. */
  updateAnswer(answerId: string, dto: CreateAnswerDto): Observable<ForumAnswer> {
    return this.http.patch<ForumAnswer>(`${this.base}/answers/${encodeURIComponent(answerId)}`, dto);
  }

  /** `PATCH /api/forum/answers/{answerId}/accept` — auteur de la question uniquement. */
  acceptAnswer(answerId: string): Observable<unknown> {
    return this.http.patch(`${this.base}/answers/${encodeURIComponent(answerId)}/accept`, {});
  }

  /** `DELETE /api/forum/answers/{answerId}` — auteur ou modérateur. */
  deleteAnswer(answerId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/answers/${encodeURIComponent(answerId)}`);
  }
}
