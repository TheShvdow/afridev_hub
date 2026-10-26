import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ProjectSort = 'newest' | 'stars' | 'popular' | 'activity';

export interface ProjectAuthor {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputation: number;
}

export interface ProjectTagLink {
  tag: { name: string; slug: string };
}

export interface ProjectCategory {
  name: string;
  slug: string;
  icon: string | null;
}

/** Élément de `GET /api/projects`. */
export interface ProjectListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  country: string;
  repoUrl: string;
  demoUrl: string | null;
  githubStars: number;
  githubForks: number;
  githubLanguage: string | null;
  githubLastPush: string | null;
  githubSyncedAt: string | null;
  createdAt: string;
  category: ProjectCategory | null;
  user: ProjectAuthor;
  projectTags: ProjectTagLink[];
  _count: { stars: number };
}

export interface ProjectOgMeta {
  ogTitle: string;
  ogDescription: string;
  ogImage: string | null;
  ogUrl: string;
}

/** Réponse de `GET /api/projects/{idOrSlug}`. */
export interface ProjectDetail extends ProjectListItem {
  ogMeta: ProjectOgMeta;
  starredByViewer?: boolean;
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

export interface ListProjectsQuery {
  page?: number;
  limit?: number;
  category?: string;
  stack?: string[];
  country?: string;
  sort?: ProjectSort;
  search?: string;
}

export type GithubImport = 'imported' | 'unavailable' | 'removed';

export interface CreateProjectDto {
  name: string;
  description: string;
  country: string;
  repoUrl: string;
  demoUrl?: string | null;
  tags: string[];
  categorySlug: string;
}

export interface CreatedProject extends ProjectListItem {
  githubImport: GithubImport;
}

export interface RefreshedProject extends ProjectListItem {
  githubImport: GithubImport;
}

export interface StarResult {
  starred: boolean;
  stars: number;
}

export type UpdateProjectDto = Partial<CreateProjectDto>;

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/projects`;

  /** `GET /api/projects` — filtres combinables et pagination. */
  listProjects(query: ListProjectsQuery = {}): Observable<Paginated<ProjectListItem>> {
    let params = new HttpParams();

    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.limit !== undefined) params = params.set('limit', query.limit);
    if (query.category) params = params.set('category', query.category);
    if (query.stack?.length) params = params.set('stack', query.stack.join(','));
    if (query.country) params = params.set('country', query.country);
    if (query.sort) params = params.set('sort', query.sort);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<Paginated<ProjectListItem>>(this.base, { params });
  }

  /** `GET /api/projects/{idOrSlug}` — page publique, par slug ou identifiant. */
  getProject(idOrSlug: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.base}/${encodeURIComponent(idOrSlug)}`);
  }

  /** `POST /api/projects` — badge « dev vérifié » requis. */
  createProject(dto: CreateProjectDto): Observable<CreatedProject> {
    return this.http.post<CreatedProject>(this.base, dto);
  }

  /** `PATCH /api/projects/{id}` — auteur uniquement. */
  updateProject(id: string, dto: UpdateProjectDto): Observable<ProjectListItem> {
    return this.http.patch<ProjectListItem>(`${this.base}/${encodeURIComponent(id)}`, dto);
  }

  /** `DELETE /api/projects/{id}` — auteur, modérateur ou admin. */
  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }

  /** `POST /api/projects/{id}/star` — ajoute ou retire l'étoile du membre connecté. */
  toggleStar(id: string): Observable<StarResult> {
    return this.http.post<StarResult>(`${this.base}/${encodeURIComponent(id)}/star`, null);
  }

  /** `POST /api/projects/{id}/refresh` — auteur ou modération, une fois par heure. */
  refreshProject(id: string): Observable<RefreshedProject> {
    return this.http.post<RefreshedProject>(`${this.base}/${encodeURIComponent(id)}/refresh`, null);
  }

  /** `GET /api/projects/categories` — catégories prédéfinies. */
  listCategories(): Observable<ProjectCategory[]> {
    return this.http.get<ProjectCategory[]>(`${this.base}/categories`);
  }
}
