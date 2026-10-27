import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from './forum.service';

export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP';
export type JobMode = 'REMOTE' | 'ONSITE' | 'HYBRID';

export const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'FULL_TIME', label: 'CDI' },
  { value: 'PART_TIME', label: 'Temps partiel' },
  { value: 'CONTRACT', label: 'CDD' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'INTERNSHIP', label: 'Stage' },
];

export const JOB_MODES: { value: JobMode; label: string }[] = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybride' },
  { value: 'ONSITE', label: 'Sur site' },
];

/** Contraintes de `CreateJobDto`. */
export const JOB_LIMITS = {
  title: { min: 5, max: 120 },
  description: { min: 100, max: 20000 },
  company: { max: 100 },
  stack: { min: 1, max: 5 },
} as const;

export interface JobConvertedSalary {
  currency: string;
  salaryMin: number;
  salaryMax: number;
  ratesAt: string | null;
}

/** Offre renvoyée par `GET /api/jobs` et `GET /api/jobs/{id}`. */
export interface JobOffer {
  id: string;
  title: string;
  description?: string;
  company: string;
  country: string;
  type: JobType;
  mode: JobMode;
  stack: string[];
  status: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  converted?: JobConvertedSalary | null;
  publishedAt: string | null;
  expiresAt: string;
  createdAt: string;
  recruiter: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

export interface ListJobsQuery {
  page?: number;
  limit?: number;
  type?: JobType;
  mode?: JobMode;
  country?: string;
  stack?: string[];
  salaryMin?: number;
  currency?: string;
  search?: string;
}

export interface CreateJobDto {
  title: string;
  description: string;
  company: string;
  country: string;
  type: JobType;
  mode: JobMode;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  stack: string[];
}

export interface JobApplication {
  id: string;
  message: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/jobs`;

  /** `GET /api/jobs` — offres actives, filtres combinables. */
  list(query: ListJobsQuery = {}): Observable<Paginated<JobOffer>> {
    let params = new HttpParams();

    if (query.page !== undefined) params = params.set('page', query.page);
    if (query.limit !== undefined) params = params.set('limit', query.limit);
    if (query.type) params = params.set('type', query.type);
    if (query.mode) params = params.set('mode', query.mode);
    if (query.country) params = params.set('country', query.country);
    if (query.stack?.length) params = params.set('stack', query.stack.join(','));
    if (query.salaryMin) params = params.set('salaryMin', query.salaryMin);
    if (query.currency) params = params.set('currency', query.currency);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<Paginated<JobOffer>>(this.base, { params });
  }

  /** `GET /api/jobs/{id}` */
  get(id: string): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.base}/${encodeURIComponent(id)}`);
  }

  /** `POST /api/jobs` — profil recruteur requis ; l'offre part en validation. */
  create(dto: CreateJobDto): Observable<JobOffer> {
    return this.http.post<JobOffer>(this.base, dto);
  }

  /** `POST /api/jobs/{id}/apply` */
  apply(id: string, dto: { message: string }): Observable<JobApplication> {
    return this.http.post<JobApplication>(`${this.base}/${encodeURIComponent(id)}/apply`, dto);
  }

  /** `GET /api/jobs/review` — offres en attente de validation (modérateur). */
  listPendingReview(page = 1): Observable<Paginated<JobOffer>> {
    const params = new HttpParams().set('page', page);
    return this.http.get<Paginated<JobOffer>>(`${this.base}/review`, { params });
  }

  /** `PATCH /api/jobs/{id}/approve` */
  approve(id: string): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.base}/${encodeURIComponent(id)}/approve`, {});
  }

  /** `PATCH /api/jobs/{id}/reject` — motif de 5 à 500 caractères. */
  reject(id: string, reason: string): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.base}/${encodeURIComponent(id)}/reject`, { reason });
  }
}
