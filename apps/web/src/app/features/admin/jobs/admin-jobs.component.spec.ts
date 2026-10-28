import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AdminJobsComponent } from './admin-jobs.component';
import { JobOffer, JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';

const OFFER: JobOffer = {
  id: 'job-1',
  title: 'Développeur Flutter',
  description: 'Une description',
  company: 'Wave',
  country: 'SN',
  type: 'FULL_TIME',
  mode: 'HYBRID',
  stack: ['flutter'],
  status: 'PENDING_REVIEW',
  salaryMin: 900000,
  salaryMax: 1400000,
  currency: 'XOF',
  publishedAt: null,
  expiresAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  recruiter: { id: 'u1', username: 'wave_recruiter', displayName: null, avatarUrl: null },
};

describe('AdminJobsComponent', () => {
  const jobs = { listPendingReview: jest.fn(), approve: jest.fn(), reject: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [AdminJobsComponent],
      providers: [provideRouter([]), { provide: JobsService, useValue: jobs }, { provide: ToastService, useValue: toast }],
    });
    const fixture = TestBed.createComponent(AdminJobsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jobs.listPendingReview.mockReturnValue(of({ data: [OFFER], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }));
  });

  it('lists the pending offers', () => {
    expect(create().nativeElement.textContent).toContain('Développeur Flutter');
  });

  it('approves an offer and reloads the list', () => {
    jobs.approve.mockReturnValue(of(OFFER));
    const fixture = create();

    fixture.componentInstance.approve(OFFER);

    expect(jobs.approve).toHaveBeenCalledWith('job-1');
    expect(jobs.listPendingReview).toHaveBeenCalledTimes(2);
  });

  it('refuses a rejection reason shorter than 5 characters', () => {
    const fixture = create();

    fixture.componentInstance.reject(OFFER, ' ok ');

    expect(jobs.reject).not.toHaveBeenCalled();
    expect(fixture.componentInstance.reasonError()).toContain('5 caractères');
  });

  it('rejects an offer with the trimmed reason', () => {
    jobs.reject.mockReturnValue(of(OFFER));
    const fixture = create();

    fixture.componentInstance.reject(OFFER, '  Salaire incohérent  ');

    expect(jobs.reject).toHaveBeenCalledWith('job-1', 'Salaire incohérent');
  });
});
