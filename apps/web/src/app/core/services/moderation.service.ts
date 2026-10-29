import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Paginated } from './forum.service';

export type ReportEntityType = 'POST' | 'ANSWER' | 'PROJECT' | 'JOB';
export type ReportReason = 'SPAM' | 'OFFENSIVE' | 'OFF_TOPIC' | 'DUPLICATE' | 'OTHER';

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam ou publicité' },
  { value: 'OFFENSIVE', label: 'Contenu offensant' },
  { value: 'OFF_TOPIC', label: 'Hors sujet' },
  { value: 'DUPLICATE', label: 'Doublon' },
  { value: 'OTHER', label: 'Autre' },
];

/** Contrainte de `CreateReportDto.details`. */
export const REPORT_DETAILS_MAX_LENGTH = 500;

export interface CreateReportDto {
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  details?: string;
}

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED';
export type ReportResolution = 'HIDDEN' | 'RESTORED' | 'WARNING';

export const REPORT_STATUSES: { value: ReportStatus; label: string }[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'REVIEWED', label: 'Examinés' },
  { value: 'RESOLVED', label: 'Résolus' },
  { value: 'DISMISSED', label: 'Ignorés' },
];

export const REPORT_RESOLUTIONS: { value: ReportResolution; label: string }[] = [
  { value: 'HIDDEN', label: 'Masquer le contenu' },
  { value: 'WARNING', label: 'Avertir l\'auteur' },
  { value: 'RESTORED', label: 'Laisser visible' },
];

/** Signalement de `GET /api/moderation/reports` (`reason` : « MOTIF » ou « MOTIF : précisions »). */
export interface AdminReport {
  id: string;
  entityType: ReportEntityType;
  entityId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
  /** Où se trouve le contenu signalé ; null si le contenu a été supprimé. */
  target?: ReportTarget | null;
}

/** De quoi bâtir le lien vers un contenu signalé. */
export interface ReportTarget {
  title: string;
  /** Question concernée, ou question parente d'une réponse. */
  postId?: string;
  /** Identifiant lisible d'un projet. */
  slug?: string;
  /** Offre d'emploi concernée. */
  jobId?: string;
}

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient);

  /** `POST /api/moderation/reports` — un seul signalement par membre et par contenu. */
  report(dto: CreateReportDto): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/moderation/reports`, dto);
  }

  /** `GET /api/moderation/reports` — signalements d'un statut, 20 par page (modérateur). */
  listReports(status: ReportStatus, page = 1): Observable<Paginated<AdminReport>> {
    const params = new HttpParams().set('status', status).set('page', page);
    return this.http.get<Paginated<AdminReport>>(`${environment.apiUrl}/moderation/reports`, { params });
  }

  /** `PATCH /api/moderation/reports/{id}/resolve` */
  resolveReport(id: string, action: ReportResolution, note?: string): Observable<unknown> {
    return this.http.patch(`${environment.apiUrl}/moderation/reports/${encodeURIComponent(id)}/resolve`, { action, note });
  }

  /** `PATCH /api/moderation/reports/{id}/dismiss` — le contenu redevient visible. */
  dismissReport(id: string, note?: string): Observable<unknown> {
    return this.http.patch(`${environment.apiUrl}/moderation/reports/${encodeURIComponent(id)}/dismiss`, { note });
  }

  /** `POST /api/moderation/users/ban` */
  banUser(userId: string, reason: string): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/moderation/users/ban`, { userId, reason });
  }

  /** `PATCH /api/moderation/users/{userId}/unban` */
  unbanUser(userId: string): Observable<unknown> {
    return this.http.patch(`${environment.apiUrl}/moderation/users/${encodeURIComponent(userId)}/unban`, {});
  }
}
