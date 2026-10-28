import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobApplyComponent } from './job-apply.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService } from '../../../core/services/upload.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthStore } from '../../../core/store/auth.store';

describe('JobApplyComponent', () => {
  const jobs = { apply: jest.fn() };
  const uploads = { uploadCv: jest.fn() };
  const users = { getPublicProfile: jest.fn() };
  const toast = { success: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [JobApplyComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: UploadService, useValue: uploads },
        { provide: UsersService, useValue: users },
        { provide: ToastService, useValue: toast },
        { provide: CountriesService, useValue: { list: () => of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]) } },
        { provide: AuthStore, useValue: { currentUser: () => ({ id: 'u1', username: 'aminata_dev', email: 'aminata@demo.afridev.hub', displayName: 'Aminata Diallo' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'job-1']]) } } },
      ],
    });
    const fixture = TestBed.createComponent(JobApplyComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    users.getPublicProfile.mockReturnValue(of(null));
  });

  it('prefills the name from the account and the rest from the profile without overwriting typed values', () => {
    users.getPublicProfile.mockReturnValue(
      of({ displayName: 'Aminata D.', country: 'SN', location: 'Dakar', githubUsername: 'aminata-dev', linkedinUsername: 'aminata-diallo', websiteUrl: 'https://aminata.dev', stack: ['Angular', 'NestJS'] }),
    );
    const component = create();

    expect(component.form.controls.fullName.value).toBe('Aminata Diallo');
    expect(component.form.getRawValue()).toMatchObject({
      country: 'SN',
      city: 'Dakar',
      githubUrl: 'https://github.com/aminata-dev',
      linkedinUrl: 'https://www.linkedin.com/in/aminata-diallo',
      portfolioUrl: 'https://aminata.dev',
      stack: 'Angular, NestJS',
    });
  });

  it('prefills as soon as the profile arrives when the page was opened directly', () => {
    const me = signal<{ id: string; username: string; email: string; displayName: string } | null>(null);
    TestBed.configureTestingModule({
      imports: [JobApplyComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: UploadService, useValue: uploads },
        { provide: UsersService, useValue: users },
        { provide: ToastService, useValue: toast },
        { provide: CountriesService, useValue: { list: () => of([]) } },
        { provide: AuthStore, useValue: { currentUser: me } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'job-1']]) } } },
      ],
    });
    const fixture = TestBed.createComponent(JobApplyComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.fullName.value).toBe('');

    me.set({ id: 'u1', username: 'aminata_dev', email: 'aminata@demo.afridev.hub', displayName: 'Aminata Diallo' });
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.fullName.value).toBe('Aminata Diallo');
    expect(fixture.componentInstance.email()).toBe('aminata@demo.afridev.hub');
  });

  it('refuses a blank message or name', () => {
    const component = create();
    component.form.patchValue({ fullName: '   ', message: '   ' });

    component.submit();

    expect(jobs.apply).not.toHaveBeenCalled();
    expect(component.form.controls.message.invalid).toBe(true);
    expect(component.form.controls.fullName.invalid).toBe(true);
  });

  it('validates links, phone and experience', () => {
    const component = create();
    component.form.patchValue({ githubUrl: 'github.com/x', linkedinUrl: 'https://ok.com/in/x', phone: 'abc', experienceYears: 80 });

    expect(component.form.controls.githubUrl.hasError('url')).toBe(true);
    expect(component.form.controls.linkedinUrl.valid).toBe(true);
    expect(component.form.controls.phone.hasError('phone')).toBe(true);
    expect(component.form.controls.experienceYears.hasError('max')).toBe(true);
  });

  it('sends the filled fields only, trimmed, and goes back to the offer', () => {
    jobs.apply.mockReturnValue(of({ id: 'a1' }));
    const component = create();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.patchValue({
      fullName: '  Aminata Diallo ',
      phone: ' +221 77 123 45 67 ',
      country: 'SN',
      githubUrl: 'https://github.com/aminata-dev',
      experienceYears: 3,
      availableFrom: '2026-12-01',
      expectedSalary: 900000,
      expectedCurrency: 'XOF',
      stack: 'Angular, NestJS, angular',
      message: '  Motivé par ce poste.  ',
    });

    component.submit();

    expect(jobs.apply).toHaveBeenCalledWith('job-1', {
      message: 'Motivé par ce poste.',
      fullName: 'Aminata Diallo',
      phone: '+221 77 123 45 67',
      country: 'SN',
      city: undefined,
      linkedinUrl: undefined,
      githubUrl: 'https://github.com/aminata-dev',
      portfolioUrl: undefined,
      experienceYears: 3,
      availableFrom: '2026-12-01',
      expectedSalary: 900000,
      expectedCurrency: 'XOF',
      stack: ['Angular', 'NestJS'],
      cvKey: undefined,
    });
    expect(toast.success).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/jobs', 'job-1']);
  });

  it('sends no currency when no salary is given', () => {
    jobs.apply.mockReturnValue(of({ id: 'a1' }));
    const component = create();
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.patchValue({ message: 'Bonjour', expectedSalary: null });

    component.submit();

    expect(jobs.apply.mock.calls[0][1].expectedCurrency).toBeUndefined();
  });

  it('uploads the CV first and sends its key with the application', () => {
    uploads.uploadCv.mockReturnValue(of('cvs/u1/abc.pdf'));
    jobs.apply.mockReturnValue(of({ id: 'a1' }));
    const component = create();
    jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const pdf = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
    component.onCvSelected({ target: { files: [pdf], value: '' } } as unknown as Event);
    component.form.patchValue({ message: 'Bonjour' });

    component.submit();

    expect(uploads.uploadCv).toHaveBeenCalledWith(pdf);
    expect(jobs.apply.mock.calls[0][1].cvKey).toBe('cvs/u1/abc.pdf');
  });

  it('rejects a CV that is not a PDF or is too large', () => {
    const component = create();
    const input = { files: [new File(['x'], 'cv.docx', { type: 'application/msword' })], value: 'cv.docx' };

    component.onCvSelected({ target: input } as unknown as Event);

    expect(component.cvError()).toBe('Le CV doit être un fichier PDF.');
    expect(component.cvFile()).toBeNull();

    const big = new File([new ArrayBuffer(6 * 1024 * 1024)], 'cv.pdf', { type: 'application/pdf' });
    component.onCvSelected({ target: { files: [big], value: '' } } as unknown as Event);
    expect(component.cvError()).toBe('Le CV ne doit pas dépasser 5 Mo.');
  });

  it('tells the member the CV could not be sent and does not apply', () => {
    uploads.uploadCv.mockReturnValue(throwError(() => new Error('Envoi du CV refusé (403)')));
    const component = create();
    component.onCvSelected({ target: { files: [new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })], value: '' } } as unknown as Event);
    component.form.patchValue({ message: 'Bonjour' });

    component.submit();

    expect(jobs.apply).not.toHaveBeenCalled();
    expect(component.errorMessage()).toContain("Le CV n'a pas pu être envoyé");
    expect(component.sending()).toBe(false);
  });

  it('shows the API message when already applied', () => {
    jobs.apply.mockReturnValue(
      throwError(() => ({ status: 409, error: { error: { code: 'JOBS_ALREADY_APPLIED', message: 'Vous avez déjà postulé à cette offre.' } } })),
    );
    const component = create();
    component.form.patchValue({ message: 'Bonjour' });

    component.submit();

    expect(component.errorMessage()).toBe('Vous avez déjà postulé à cette offre.');
  });
});
