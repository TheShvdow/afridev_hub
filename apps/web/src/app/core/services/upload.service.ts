import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Contraintes de `CvPresignDto` : un PDF de 5 Mo au plus. */
export const CV_MIME_TYPE = 'application/pdf';
export const CV_MAX_BYTES = 5 * 1024 * 1024;

export interface CvPresign {
  uploadUrl: string;
  key: string;
  expiresIn: number;
}

/** Message affichable quand le fichier ne respecte pas les contraintes, sinon `null`. */
export function cvFileError(file: { type: string; size: number }): string | null {
  if (file.type !== CV_MIME_TYPE) return 'Le CV doit être un fichier PDF.';
  if (file.size > CV_MAX_BYTES) return 'Le CV ne doit pas dépasser 5 Mo.';
  if (file.size === 0) return 'Ce fichier est vide.';
  return null;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly http = inject(HttpClient);

  /** `POST /api/upload/cv-presign` — URL signée (PUT, 5 min) et clé à joindre à la candidature. */
  presignCv(file: { size: number }): Observable<CvPresign> {
    return this.http.post<CvPresign>(`${environment.apiUrl}/upload/cv-presign`, {
      mimeType: CV_MIME_TYPE,
      fileSizeBytes: file.size,
    });
  }

  /**
   * Envoie le CV vers le stockage et renvoie sa clé. L'envoi passe par `fetch` et non par HttpClient :
   * l'intercepteur d'authentification y ajouterait un en-tête Authorization qui invaliderait l'URL signée.
   */
  uploadCv(file: File): Observable<string> {
    return this.presignCv(file).pipe(
      switchMap(({ uploadUrl, key }) =>
        from(
          fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': CV_MIME_TYPE } }).then((response) => {
            if (!response.ok) throw new Error(`Envoi du CV refusé (${response.status})`);
          }),
        ).pipe(map(() => key)),
      ),
    );
  }
}
