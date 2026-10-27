import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ReportEntityType = 'POST' | 'ANSWER' | 'PROJECT';
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

@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly http = inject(HttpClient);

  /** `POST /api/moderation/reports` — un seul signalement par membre et par contenu. */
  report(dto: CreateReportDto): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/moderation/reports`, dto);
  }
}
