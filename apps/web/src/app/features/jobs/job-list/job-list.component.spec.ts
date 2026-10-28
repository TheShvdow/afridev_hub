import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobListComponent } from './job-list.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobOffer, JobsService } from '../../../core/services/jobs.service';

function offer(id: string, title: string): JobOffer {
  return {
    id,
    title,
    company: 'GTECH',
    country: 'SN',
    type: 'FULL_TIME',
    mode: 'REMOTE',
    stack: ['NestJS'],
    status: 'ACTIVE',
    salaryMin: 500000,
    salaryMax: 800000,
    currency: 'XOF',
    publishedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    createdAt: new Date().toISOString(),
    recruiter: { id: 'u1', username: 'rec', displayName: null, avatarUrl: null },
  };
}

const page = (data: JobOffer[], pageNumber = 1, totalPages = 1) => ({
  data,
  meta: { total: data.length, page: pageNumber, limit: 12, totalPages },
});

describe('JobListComponent', () => {
  let fixture: ComponentFixture<JobListComponent>;
  let component: JobListComponent;
  let jobsStub: { list: jest.Mock };

  async function setup(list: jest.Mock) {
    jobsStub = { list };
    await TestBed.configureTestingModule({
      imports: [JobListComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobsStub },
        { provide: CountriesService, useValue: { list: () => of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JobListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renders the offers returned by the API', async () => {
    await setup(jest.fn().mockReturnValue(of(page([offer('1', 'Dev A'), offer('2', 'Dev B')]))));

    expect(fixture.nativeElement.querySelectorAll('app-card-job').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Dev A');
  });

  it('sends the selected country code and mode to the API', async () => {
    await setup(jest.fn().mockReturnValue(of(page([]))));

    component.selectedCountry.set('Sénégal');
    component.selectedWorkType.set('Remote');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(jobsStub.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ country: 'SN', mode: 'REMOTE', page: 1 }),
    );
    expect(fixture.nativeElement.textContent).toContain('Aucune offre');
  });

  it('appends the next page when loading more', async () => {
    const list = jest
      .fn()
      .mockReturnValueOnce(of(page([offer('1', 'Dev A')], 1, 2)))
      .mockReturnValueOnce(of(page([offer('2', 'Dev B')], 2, 2)));
    await setup(list);

    component.loadMore();
    fixture.detectChanges();

    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(fixture.nativeElement.querySelectorAll('app-card-job').length).toBe(2);
    expect(component.hasMore()).toBe(false);
  });

  it('shows the API error and lets the user retry', async () => {
    const list = jest
      .fn()
      .mockReturnValueOnce(throwError(() => ({ status: 500, error: { error: { message: 'Erreur interne du serveur.' } } })))
      .mockReturnValueOnce(of(page([offer('1', 'Dev A')])));
    await setup(list);

    expect(fixture.nativeElement.textContent).toContain('Erreur interne du serveur.');

    component.retry();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('app-card-job').length).toBe(1);
  });

  it('opens the detail panel when a card is selected', async () => {
    await setup(jest.fn().mockReturnValue(of(page([offer('1', 'Dev A')]))));

    component.openJob(component.jobs()[0]);
    fixture.detectChanges();

    expect(component.selectedJob()?.id).toBe('1');
    expect(fixture.nativeElement.querySelector('app-job-detail-panel')).toBeTruthy();
  });
});
