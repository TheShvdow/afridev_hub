import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CV_MAX_BYTES, UploadService, cvFileError } from './upload.service';

describe('cvFileError', () => {
  it('accepts a PDF within 5 MB', () => {
    expect(cvFileError({ type: 'application/pdf', size: 350_000 })).toBeNull();
    expect(cvFileError({ type: 'application/pdf', size: CV_MAX_BYTES })).toBeNull();
  });

  it('rejects other types, oversize and empty files', () => {
    expect(cvFileError({ type: 'image/png', size: 100 })).toBe('Le CV doit être un fichier PDF.');
    expect(cvFileError({ type: 'application/pdf', size: CV_MAX_BYTES + 1 })).toBe('Le CV ne doit pas dépasser 5 Mo.');
    expect(cvFileError({ type: 'application/pdf', size: 0 })).toBe('Ce fichier est vide.');
  });
});

describe('UploadService', () => {
  let service: UploadService;
  let controller: HttpTestingController;
  const originalFetch = global.fetch;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UploadService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    controller.verify();
  });

  it('asks the API for a signed URL with the PDF type and size', () => {
    service.presignCv({ size: 1234 }).subscribe();

    const request = controller.expectOne((req) => req.url.endsWith('/upload/cv-presign'));
    expect(request.request.body).toEqual({ mimeType: 'application/pdf', fileSizeBytes: 1234 });
    request.flush({ uploadUrl: 'https://r2.example/put', key: 'cvs/u1/a.pdf', expiresIn: 300 });
  });

  it('puts the file on the signed URL with fetch (no Authorization header) and returns the key', (done) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as never;
    const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });

    service.uploadCv(file).subscribe((key) => {
      expect(key).toBe('cvs/u1/a.pdf');
      expect(global.fetch).toHaveBeenCalledWith('https://r2.example/put', {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'application/pdf' },
      });
      done();
    });

    controller
      .expectOne((req) => req.url.endsWith('/upload/cv-presign'))
      .flush({ uploadUrl: 'https://r2.example/put', key: 'cvs/u1/a.pdf', expiresIn: 300 });
  });

  it('fails when the storage refuses the file', (done) => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 }) as never;

    service.uploadCv(new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })).subscribe({
      error: (error) => {
        expect(error.message).toContain('403');
        done();
      },
    });

    controller
      .expectOne((req) => req.url.endsWith('/upload/cv-presign'))
      .flush({ uploadUrl: 'https://r2.example/put', key: 'cvs/u1/a.pdf', expiresIn: 300 });
  });
});
