import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobPostComponent } from './job-post.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';
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
  const jobs = { create: jest.fn() };
  const users = { enableRecruiter: jest.fn() };
  const toast = { success: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [JobPostComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: UsersService, useValue: users },
        { provide: ToastService, useValue: toast },
        { provide: CountriesService, useValue: { list: () => of([]) } },
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

  it('sends a normalized offer and goes back to the list', () => {
    jobs.create.mockReturnValue(of({ id: 'job-1' }));
    const component = create();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.form.setValue(VALID);

    component.submit();

    expect(jobs.create).toHaveBeenCalledWith(
      expect.objectContaining({ company: 'GTECH', stack: ['NestJS', 'Docker'], salaryMin: 500000, country: 'SN' }),
    );
    expect(navigate).toHaveBeenCalledWith('/jobs');
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
});
