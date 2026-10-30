export interface JobAlert {
  id: string;
  country: string;
  mode: string;
  stack: string[];
  salaryMin: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateJobAlertDto {
  country?: string;
  mode?: string;
  stack?: string[];
  salaryMin?: number;
  currency?: string;
}

export interface RecruiterPlan {
  planType: string;
  isPremium: boolean;
  premiumUntil?: any;
  offersThisMonth: number;
  monthlyLimit: number | null;
}

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type JobType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP';
export type JobMode = 'REMOTE' | 'ONSITE' | 'HYBRID';

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

export interface JobRecruiter {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  reputation?: number;
}

export interface JobConverted {
  currency: string;
  salaryMin: number | null;
  salaryMax: number | null;
  ratesAt: any;
}

export interface ApiJob {
  id: string;
  title: string;
  description: string;
  company: string;
  country: string;
  type: JobType;
  mode: JobMode;
  stack: string[];
  status: string;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  converted?: JobConverted;
  publishedAt: any;
  rejectionReason?: any;
  expiresAt: string;
  createdAt: string;
  recruiter?: JobRecruiter;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currency?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
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

@Injectable({ providedIn: 'root' })
export class JobsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/jobs`;

  listJobs(query: ListJobsQuery = {}): Observable<Paginated<ApiJob>> {
    let params = new HttpParams();

    if (query.page !== undefined) params = params.set('page', query.page.toString());
    if (query.limit !== undefined) params = params.set('limit', query.limit.toString());
    if (query.type) params = params.set('type', query.type);
    if (query.mode) params = params.set('mode', query.mode);
    if (query.country) params = params.set('country', query.country);
    if (query.stack?.length) params = params.set('stack', query.stack.join(','));
    if (query.salaryMin !== undefined) params = params.set('salaryMin', query.salaryMin.toString());
    if (query.currency) params = params.set('currency', query.currency);
    if (query.search) params = params.set('search', query.search);

    return this.http.get<Paginated<ApiJob>>(this.base, { params });
  }

  getJob(id: string, currency?: string): Observable<ApiJob> {
    let params = new HttpParams();
    if (currency) params = params.set('currency', currency);
    return this.http
      .get<{ data: ApiJob } | ApiJob>(`${this.base}/${encodeURIComponent(id)}`, { params })
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  createJob(dto: CreateJobDto): Observable<ApiJob> {
    return this.http
      .post<{ data: ApiJob } | ApiJob>(this.base, dto)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  listMyJobs(): Observable<ApiJob[]> {
    return this.http
      .get<{ data: ApiJob[] } | ApiJob[]>(`${this.base}/mine`)
      .pipe(map((res: any) => (Array.isArray(res) ? res : res?.data || [])));
  }

  getRecruiterPlan(): Observable<RecruiterPlan> {
    return this.http
      .get<{ data: RecruiterPlan } | RecruiterPlan>(`${this.base}/plan`)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  listJobsForReview(page = 1, limit = 20): Observable<Paginated<ApiJob>> {
    const params = new HttpParams().set('page', page.toString()).set('limit', limit.toString());
    return this.http.get<Paginated<ApiJob>>(`${this.base}/review`, { params });
  }

  approveJob(id: string): Observable<ApiJob> {
    return this.http
      .patch<{ data: ApiJob } | ApiJob>(`${this.base}/${encodeURIComponent(id)}/approve`, {})
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  rejectJob(id: string, reason: string): Observable<ApiJob> {
    return this.http
      .patch<{ data: ApiJob } | ApiJob>(`${this.base}/${encodeURIComponent(id)}/reject`, { reason })
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  listJobAlerts(): Observable<JobAlert[]> {
    return this.http
      .get<{ data: JobAlert[] } | JobAlert[]>(`${this.base}/alerts`)
      .pipe(map((res: any) => (Array.isArray(res) ? res : res?.data || [])));
  }

  createJobAlert(dto: CreateJobAlertDto): Observable<JobAlert> {
    return this.http
      .post<{ data: JobAlert } | JobAlert>(`${this.base}/alerts`, dto)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  deleteJobAlert(alertId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/alerts/${encodeURIComponent(alertId)}`);
  }

  updateJob(id: string, dto: Partial<CreateJobDto>): Observable<ApiJob> {
    return this.http
      .patch<{ data: ApiJob } | ApiJob>(`${this.base}/${encodeURIComponent(id)}`, dto)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  closeJob(id: string): Observable<ApiJob> {
    return this.http
      .patch<{ data: ApiJob } | ApiJob>(`${this.base}/${encodeURIComponent(id)}/close`, {})
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  renewJob(id: string): Observable<ApiJob> {
    return this.http
      .patch<{ data: ApiJob } | ApiJob>(`${this.base}/${encodeURIComponent(id)}/renew`, {})
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  applyToJob(id: string, dto: { message: string; cvKey?: string }): Observable<any> {
    return this.http
      .post<{ data: any } | any>(`${this.base}/${encodeURIComponent(id)}/apply`, dto)
      .pipe(map((res: any) => (res && res.data ? res.data : res)));
  }

  getJobApplications(id: string): Observable<any[]> {
    return this.http
      .get<{ data: any[] } | any[]>(`${this.base}/${encodeURIComponent(id)}/applications`)
      .pipe(map((res: any) => (Array.isArray(res) ? res : res?.data || [])));
  }
}
