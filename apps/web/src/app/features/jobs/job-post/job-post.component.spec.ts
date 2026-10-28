import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobPostComponent } from './job-post.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthStore } from '../../../core/store/auth.store';
import { UsersService } from '../../../core/services/users.service';

const VALID = {
  title: 'Développeur NestJS',
  company: ' GTECH ',
  country: 'SN',
  type: 'FULL_TIME' as const,
  mode: 'REMOTE' as const,
  salaryMin: 500000,
  salaryMax: 800000,
  currency: 'XOF',
  stack: 'NestJS, Docker, nestjs',
  description: 'x'.repeat(100),
};

describe('JobPostComponent', () => {
  const jobs = { create: jest.fn(), get: jest.fn(), update: jest.fn() };
  const users = { enableRecruiter: jest.fn() };
  const toast = { success: jest.fn() };

  function create(editId: string | null = null, me = { id: 'rec-1' }) {
    TestBed.configureTestingModule({
      imports: [JobPostComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: UsersService, useValue: users },
        { provide: ToastService, useValue: toast },
        { provide: CountriesService, useValue: { list: () => of([]) } },
        { provide: AuthStore, useValue: { currentUser: () => me } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(editId ? { id: editId } : {}) } } },
      ],
    });
    const fixture = TestBed.createComponent(JobPostComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => jest.clearAllMocks());

  it('rejects a salary range where the minimum exceeds the maximum', () => {
    const component = create();
    component.form.setValue({ ...VALID, salaryMin: 900000 });

    expect(component.form.hasError('salaryRange')).toBe(true);
  });

  it('rejects more than 5 technologies', () => {
    const component = create();
    component.form.setValue({ ...VALID, stack: 'a, b, c, d, e, f' });

    expect(component.form.controls.stack.hasError('stackTooMany')).toBe(true);
  });

  it('sends a normalized offer and goes to my offers', () => {
    jobs.create.mockReturnValue(of({ id: 'job-1' }));
    const component = create();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.form.setValue(VALID);

    component.submit();

    expect(jobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'GTECH', stack: ['NestJS', 'Docker'], salaryMin: 500000, country: 'SN' }),
    );
    expect(navigate).toHaveBeenCalledWith('/jobs/mine');
  });

  it('offers to activate the recruiter profile, then retries the submission', () => {
    jobs.create
      .mockReturnValueOnce(
        throwError(() => ({ status: 403, error: { error: { code: 'JOBS_RECRUITER_REQUIRED', message: 'Activez votre profil recruteur.' } } })),
      )
      .mockReturnValueOnce(of({ id: 'job-1' }));
    users.enableRecruiter.mockReturnValue(of({}));
    const component = create();
    jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.form.setValue(VALID);

    component.submit();
    expect(component.recruiterRequired()).toBe(true);

    component.activateRecruiter();

    expect(users.enableRecruiter).toHaveBeenCalledWith('GTECH');
    expect(jobs.create).toHaveBeenCalledTimes(2);
  });

  describe('modification d\'une offre', () => {
    const offer = {
      id: 'job-1',
      title: 'Développeur Angular',
      description: 'y'.repeat(120),
      company: 'Wave',
      country: 'SN',
      type: 'CONTRACT',
      mode: 'HYBRID',
      stack: ['angular', 'rxjs'],
      status: 'ACTIVE',
      salaryMin: 400000,
      salaryMax: 650000,
      currency: 'XOF',
      recruiter: { id: 'rec-1', username: 'wave_recruiter', displayName: null, avatarUrl: null },
    };

    it('loads the offer into the form', () => {
      jobs.get.mockReturnValue(of(offer));
      const component = create('job-1');

      expect(jobs.get).toHaveBeenCalledWith('job-1');
      expect(component.editing).toBe(true);
      expect(component.form.getRawValue()).toMatchObject({
        title: 'Développeur Angular',
        company: 'Wave',
        type: 'CONTRACT',
        mode: 'HYBRID',
        salaryMin: 400000,
        stack: 'angular, rxjs',
      });
    });

    it('updates the offer instead of creating a new one, then goes to my offers', () => {
      jobs.get.mockReturnValue(of(offer));
      jobs.update.mockReturnValue(of(offer));
      const component = create('job-1');
      const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      component.form.patchValue({ salaryMax: 700000 });

      component.submit();

      expect(jobs.create).not.toHaveBeenCalled();
      expect(jobs.update).toHaveBeenCalledWith('job-1', expect.objectContaining({ salaryMax: 700000, stack: ['angular', 'rxjs'] }));
      expect(toast.success).toHaveBeenCalledWith('Offre mise à jour.');
      expect(navigate).toHaveBeenCalledWith('/jobs/mine');
    });

    it('tells the author a rejected offer goes back to moderation', () => {
      jobs.get.mockReturnValue(of({ ...offer, status: 'REJECTED' }));
      jobs.update.mockReturnValue(of(offer));
      const component = create('job-1');
      jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

      component.submit();

      expect(toast.success).toHaveBeenCalledWith('Offre corrigée : elle repart en validation par la modération.');
    });

    it('refuses to edit an offer of another recruiter', () => {
      jobs.get.mockReturnValue(of({ ...offer, recruiter: { ...offer.recruiter, id: 'other' } }));
      const component = create('job-1');

      expect(component.offerProblem()).toBe('forbidden');
      component.submit();
      expect(jobs.update).not.toHaveBeenCalled();
    });

    it('shows a not-found state for an unknown offer', () => {
      jobs.get.mockReturnValue(throwError(() => ({ status: 404 })));

      expect(create('missing').offerProblem()).toBe('notFound');
    });

    it('shows the API message when the update is refused', () => {
      jobs.get.mockReturnValue(of(offer));
      jobs.update.mockReturnValue(throwError(() => ({ status: 400, error: { error: { message: 'Le salaire minimum ne peut pas dépasser le maximum.' } } })));
      const component = create('job-1');

      component.submit();

      expect(component.errorMessage()).toBe('Le salaire minimum ne peut pas dépasser le maximum.');
      expect(component.recruiterRequired()).toBe(false);
    });
  });
});
