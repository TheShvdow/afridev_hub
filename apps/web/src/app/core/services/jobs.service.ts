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
  /** Motif du refus de la modération, visible du recruteur. */
  rejectionReason?: string | null;
  salaryMin: number;
  salaryMax: number;
  currency: string;
  converted?: JobConvertedSalary | null;
  publishedAt: string | null;
  expiresAt: string;
  createdAt: string;
  recruiter: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

/** Offre de `GET /api/jobs/mine` : tous statuts confondus, avec le nombre de candidatures. */
export interface MyJobOffer extends JobOffer {
  _count: { applications: number };
}

export type JobStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'REJECTED' | 'EXPIRED' | 'CLOSED';

/** `GET /api/jobs/plan` — `monthlyLimit` null : offres illimitées. */
export interface RecruiterPlan {
  planType: 'FREE' | 'PREMIUM';
  isPremium: boolean;
  premiumUntil: string | null;
  offersThisMonth: number;
  monthlyLimit: number | null;
}

/** Candidature reçue (`GET /api/jobs/:id/applications`) : les champs saisis par le candidat et son profil. */
export interface ReceivedApplication {
  id: string;
  message: string;
  status: string;
  createdAt: string;
  fullName?: string | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  experienceYears?: number | null;
  availableFrom?: string | null;
  expectedSalary?: number | null;
  expectedCurrency?: string | null;
  stack?: string[];
  /** Lien signé vers le CV, valable 10 minutes. */
  cvDownloadUrl?: string | null;
  /** Vrai avec le plan gratuit : le profil du candidat est réduit au pseudo. */
  profileTruncated?: boolean;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    email?: string;
    isVerified?: boolean;
    reputation?: number;
  };
}

/** Alerte emploi (`GET /api/jobs/alerts`) : un critère absent accepte toutes les valeurs. */
export interface JobAlert {
  id: string;
  country: string | null;
  mode: JobMode | null;
  stack: string[];
  salaryMin: number | null;
  currency: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateJobAlertDto {
  country?: string;
  mode?: JobMode;
  stack?: string[];
  salaryMin?: number;
  currency?: string;
}

/** 5 alertes au plus par membre, 5 technologies au plus par alerte (`CreateJobAlertDto`). */
export const MAX_ALERTS = 5;
export const MAX_ALERT_STACK = 5;

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

/** Devises proposées pour une offre ou des prétentions salariales (codes ISO 4217). */
export const JOB_CURRENCY_CODES = ['XOF', 'XAF', 'NGN', 'GHS', 'KES', 'ZAR', 'MAD', 'EUR', 'USD'];

/** Contenu de `ApplyJobDto` : seuls `message` et `fullName` sont obligatoires. */
export interface ApplyJobDto {
  message: string;
  fullName: string;
  phone?: string;
  country?: string;
  city?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  experienceYears?: number;
  availableFrom?: string;
  expectedSalary?: number;
  expectedCurrency?: string;
  stack?: string[];
  cvKey?: string;
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
  apply(id: string, dto: ApplyJobDto): Observable<JobApplication> {
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

  /** `GET /api/jobs/mine` — mes offres, tous statuts confondus. */
  listMine(): Observable<MyJobOffer[]> {
    return this.http.get<MyJobOffer[]>(`${this.base}/mine`);
  }

  /** `GET /api/jobs/plan` — plan recruteur et quota du mois. */
  getPlan(): Observable<RecruiterPlan> {
    return this.http.get<RecruiterPlan>(`${this.base}/plan`);
  }

  /** `PATCH /api/jobs/{id}/close` */
  close(id: string): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.base}/${encodeURIComponent(id)}/close`, {});
  }

  /** `PATCH /api/jobs/{id}/renew` — prolonge de 60 jours une offre publiée ou expirée. */
  renew(id: string): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.base}/${encodeURIComponent(id)}/renew`, {});
  }

  /** `GET /api/jobs/{id}/applications` — auteur de l'offre uniquement. */
  listApplications(id: string): Observable<ReceivedApplication[]> {
    return this.http.get<ReceivedApplication[]>(`${this.base}/${encodeURIComponent(id)}/applications`);
  }

  /** `GET /api/jobs/alerts` — mes alertes. */
  listAlerts(): Observable<JobAlert[]> {
    return this.http.get<JobAlert[]>(`${this.base}/alerts`);
  }

  /** `POST /api/jobs/alerts` — 5 alertes au plus. */
  createAlert(dto: CreateJobAlertDto): Observable<JobAlert> {
    return this.http.post<JobAlert>(`${this.base}/alerts`, dto);
  }

  /** `DELETE /api/jobs/alerts/{id}` (204) */
  deleteAlert(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/alerts/${encodeURIComponent(id)}`);
  }
}
