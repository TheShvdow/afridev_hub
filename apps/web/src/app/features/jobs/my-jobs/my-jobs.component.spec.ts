import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MyJobsComponent } from './my-jobs.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobsService, MyJobOffer, ReceivedApplication, RecruiterPlan } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';

function offer(id: string, overrides: Partial<MyJobOffer> = {}): MyJobOffer {
  return {
    id,
    title: `Offre ${id}`,
    company: 'Wave',
    country: 'SN',
    type: 'FULL_TIME',
    mode: 'REMOTE',
    stack: ['angular'],
    status: 'ACTIVE',
    salaryMin: 900000,
    salaryMax: 1400000,
    currency: 'XOF',
    publishedAt: new Date().toISOString(),
    expiresAt: '2026-12-20T00:00:00Z',
    createdAt: new Date().toISOString(),
    recruiter: { id: 'rec', username: 'wave_recruiter', displayName: null, avatarUrl: null },
    _count: { applications: 0 },
    ...overrides,
  };
}

const FREE_PLAN: RecruiterPlan = { planType: 'FREE', isPremium: false, premiumUntil: null, offersThisMonth: 3, monthlyLimit: 3 };

const APPLICATION: ReceivedApplication = {
  id: 'app-1',
  message: 'Motivée par ce poste.',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  fullName: 'Aminata Diallo',
  phone: '+221 77 123 45 67',
  country: 'SN',
  city: 'Dakar',
  githubUrl: 'https://github.com/aminata-dev',
  experienceYears: 3,
  availableFrom: '2026-12-01',
  expectedSalary: 900000,
  expectedCurrency: 'XOF',
  stack: ['Angular', 'NestJS'],
  cvDownloadUrl: 'https://r2.example/cv.pdf?sig=1',
  profileTruncated: false,
  user: { id: 'u1', username: 'aminata_dev', displayName: 'Aminata D.', avatarUrl: null, email: 'aminata@demo.afridev.hub' },
};

describe('MyJobsComponent', () => {
  const jobs = { listMine: jest.fn(), getPlan: jest.fn(), close: jest.fn(), renew: jest.fn(), listApplications: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [MyJobsComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: ToastService, useValue: toast },
        { provide: CountriesService, useValue: { list: () => of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]) } },
      ],
    });
    const fixture = TestBed.createComponent(MyJobsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jobs.getPlan.mockReturnValue(of(FREE_PLAN));
    jobs.listMine.mockReturnValue(of([offer('1', { _count: { applications: 2 } })]));
  });

  it('lists my offers with their status, application count and the monthly quota', () => {
    const text = create().nativeElement.textContent as string;

    expect(text).toContain('Offre 1');
    expect(text).toContain('En ligne');
    expect(text).toContain('2 candidatures');
    expect(text).toContain('3 offres sur 3 ce mois-ci (plan gratuit)');
    expect(text).toContain('Quota atteint');
  });

  it('shows the moderation reason of a rejected offer and no renew button', () => {
    jobs.listMine.mockReturnValue(of([offer('2', { status: 'REJECTED', rejectionReason: 'Salaire incohérent avec le poste.' })]));

    const fixture = create();
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Refusée');
    expect(text).toContain('Salaire incohérent avec le poste.');
    expect(text).not.toContain('Renouveler');
    expect(text).not.toContain('Clôturer');
  });

  it('offers to edit an offer unless it is closed', () => {
    jobs.listMine.mockReturnValue(of([offer('1'), offer('2', { status: 'CLOSED' })]));
    const fixture = create();

    const edits = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>).filter((a) => a.textContent?.trim() === 'Modifier');

    expect(edits.map((a) => a.getAttribute('href'))).toEqual(['/jobs/1/edit']);
  });

  it('renews an offer and reloads the list', () => {
    jobs.renew.mockReturnValue(of(offer('1')));
    const fixture = create();

    fixture.componentInstance.renew(fixture.componentInstance.offers()[0]);

    expect(jobs.renew).toHaveBeenCalledWith('1');
    expect(toast.success).toHaveBeenCalledWith('Offre renouvelée pour 60 jours.');
    expect(jobs.listMine).toHaveBeenCalledTimes(2);
  });

  it('asks for confirmation before closing an offer', () => {
    jobs.close.mockReturnValue(of(offer('1', { status: 'CLOSED' })));
    const fixture = create();
    const component = fixture.componentInstance;

    component.askClose(component.offers()[0]);
    expect(jobs.close).not.toHaveBeenCalled();
    expect(component.closingId()).toBe('1');

    component.confirmClose(component.offers()[0]);
    expect(jobs.close).toHaveBeenCalledWith('1');
  });

  it('opens the applications of an offer and shows every detail the applicant gave', () => {
    jobs.listApplications.mockReturnValue(of([APPLICATION]));
    const fixture = create();

    fixture.componentInstance.toggleApplications(fixture.componentInstance.offers()[0]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(jobs.listApplications).toHaveBeenCalledWith('1');
    expect(text).toContain('Aminata Diallo');
    expect(text).toContain('aminata@demo.afridev.hub');
    expect(text).toContain('+221 77 123 45 67');
    expect(text).toContain('Dakar, Sénégal');
    expect(text).toContain('3 ans');
    expect(text).toContain('Angular, NestJS');
    expect(text).toContain('Motivée par ce poste.');
    const cv = Array.from(fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>).find((a) => a.textContent?.includes('Télécharger le CV'));
    expect(cv?.getAttribute('href')).toBe('https://r2.example/cv.pdf?sig=1');
  });

  it('explains the truncated profile of the free plan', () => {
    jobs.listApplications.mockReturnValue(of([{ ...APPLICATION, profileTruncated: true, user: { ...APPLICATION.user, email: undefined } }]));
    const fixture = create();

    fixture.componentInstance.toggleApplications(fixture.componentInstance.offers()[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Plan gratuit : le profil du candidat est réduit');
    expect(fixture.nativeElement.textContent).not.toContain('aminata@demo.afridev.hub');
  });

  it('shows the error when applications cannot be loaded', () => {
    jobs.listApplications.mockReturnValue(throwError(() => ({ status: 403, error: { error: { message: "Vous n'avez pas le droit d'effectuer cette action." } } })));
    const fixture = create();

    fixture.componentInstance.toggleApplications(fixture.componentInstance.offers()[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Vous n'avez pas le droit d'effectuer cette action.");
  });

  it('shows an empty state and a retry on load error', () => {
    jobs.listMine.mockReturnValueOnce(throwError(() => ({ status: 500, error: { error: { message: 'Erreur interne du serveur.' } } }))).mockReturnValueOnce(of([]));
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain('Erreur interne du serveur.');

    fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Vous n'avez publié aucune offre");
  });
});
