import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type VoteValue = 'UP' | 'DOWN';

/** `action` : vote ajouté, changé de sens, ou annulé (même vote renvoyé). */
export interface VoteResult {
  action: 'added' | 'changed' | 'removed';
  newScore: number;
}

@Injectable({ providedIn: 'root' })
export class VotesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/votes`;

  /** `POST /api/votes/posts/{id}` — réputation ≥ 10, jamais sur son propre contenu. */
  votePost(postId: string, value: VoteValue): Observable<VoteResult> {
    return this.http.post<VoteResult>(`${this.base}/posts/${encodeURIComponent(postId)}`, { value });
  }

  /** `POST /api/votes/answers/{id}` */
  voteAnswer(answerId: string, value: VoteValue): Observable<VoteResult> {
    return this.http.post<VoteResult>(`${this.base}/answers/${encodeURIComponent(answerId)}`, { value });
  }
}
