import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminService, AdminStats } from '../../../core/services/admin.service';

const STATS: AdminStats = {
  users: { total: 42, newThisWeek: 5 },
  content: { posts: 18, projects: 7, jobs: 6 },
  projects: { visible: 7, withGithubStats: 5 },
  moderation: { pendingReports: 3 },
  revenue: { totalCommission: 125000, capturedPayments: 1 },
  forum: {
    questions: 18,
    questionsWithAnswer: 12,
    questionsWithAcceptedAnswer: 6,
    acceptedAnswerRate: 33,
    last30Days: { questions: 10, questionsWithAnswer: 4, questionsWithAcceptedAnswer: 3, acceptedAnswerRate: 30 },
  },
  jobs: { published: 14, publishedLast60Days: 12, pendingReview: 2 },
};

describe('AdminDashboardComponent', () => {
  const admin = { stats: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [AdminDashboardComponent],
      providers: [provideRouter([]), { provide: AdminService, useValue: admin }],
    });
    const fixture = TestBed.createComponent(AdminDashboardComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    admin.stats.mockReturnValue(of(STATS));
  });

  it('shows the platform figures and what needs handling', () => {
    const text = create().nativeElement.textContent as string;

    expect(text).toContain('42');
    expect(text).toContain('+5 cette semaine');
    expect(text).toContain('Signalements en attente');
    expect(text).toContain('Offres à valider');
    expect(text).toContain('125');
  });

  it('computes each success indicator against its target', () => {
    const indicators = create().componentInstance.indicators();
    const byCode = Object.fromEntries(indicators.map((indicator) => [indicator.code, indicator]));

    expect(indicators.map((indicator) => indicator.code)).toEqual(['SM-2', 'SM-3', 'SM-5', 'SM-6', 'SM-7']);
    expect(byCode['SM-2']).toMatchObject({ value: 4, target: 100 });
    expect(byCode['SM-3']).toMatchObject({ value: 1, target: 1 });
    expect(byCode['SM-5']).toMatchObject({ value: 12, target: 10 });
    expect(byCode['SM-6']).toMatchObject({ value: 5, target: 5 });
  });

  it('marks an indicator reached at its target, and SM-7 only above 30 %', () => {
    const component = create().componentInstance;
    const byCode = Object.fromEntries(component.indicators().map((indicator) => [indicator.code, indicator]));

    expect(component.reached(byCode['SM-3'])).toBe(true);
    expect(component.reached(byCode['SM-5'])).toBe(true);
    expect(component.reached(byCode['SM-2'])).toBe(false);
    // Exactement 30 % : l'objectif est « > 30 % ».
    expect(component.reached(byCode['SM-7'])).toBe(false);
  });

  it('caps the progress at 100 %', () => {
    const component = create().componentInstance;
    const byCode = Object.fromEntries(component.indicators().map((indicator) => [indicator.code, indicator]));

    expect(component.progress(byCode['SM-5'])).toBe(100);
    expect(component.progress(byCode['SM-2'])).toBe(4);
  });

  it('shows the error and retries', () => {
    admin.stats.mockReturnValueOnce(throwError(() => ({ status: 403, error: { error: { message: "Vous n'avez pas le droit d'effectuer cette action." } } }))).mockReturnValueOnce(of(STATS));
    const fixture = create();

    expect(fixture.nativeElement.textContent).toContain("Vous n'avez pas le droit d'effectuer cette action.");

    fixture.componentInstance.retry();
    fixture.detectChanges();

    expect(fixture.componentInstance.stats()?.users.total).toBe(42);
  });
});
