import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Country {
  code: string;
  alpha3: string;
  name: string;
  region: 'AFRICA' | 'DIASPORA';
}

@Injectable({ providedIn: 'root' })
export class CountriesService {
  private readonly http = inject(HttpClient);

  /** `GET /api/countries` — pays africains puis diaspora. */
  list(): Observable<Country[]> {
    return this.http.get<Country[]>(`${environment.apiUrl}/countries`);
  }
}
