import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ReportsComponent } from './reports.component';
import { AdminReport, ModerationService } from '../../../core/services/moderation.service';
import { ToastService } from '../../../core/services/toast.service';

const REPORT: AdminReport = {
  id: 'r1',
  entityType: 'POST',
  entityId: 'p1',
  reason: 'SPAM : lien publicitaire',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  user: { id: 'u1', username: 'aminata', avatarUrl: null },
};

const page = (data: AdminReport[]) => ({ data, meta: { total: data.length, page: 1, limit: 20, totalPages: 1 } });

describe('ReportsComponent', () => {
  const moderation = { listReports: jest.fn(), resolveReport: jest.fn(), dismissReport: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [ReportsComponent],
      providers: [provideRouter([]), { provide: ModerationService, useValue: moderation }, { provide: ToastService, useValue: toast }],
    });
    const fixture = TestBed.createComponent(ReportsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    moderation.listReports.mockReturnValue(of(page([REPORT])));
  });

  it('loads pending reports and splits the reason from its details', () => {
    const fixture = create();

    expect(moderation.listReports).toHaveBeenCalledWith('PENDING', 1);
    expect(fixture.nativeElement.textContent).toContain('Spam ou publicité');
    expect(fixture.nativeElement.textContent).toContain('lien publicitaire');
  });

  describe('link to the reported content', () => {
    const link = (report: Partial<AdminReport>) => create().componentInstance.contentLink({ ...REPORT, ...report });

    it('opens the question for a reported question', () => {
      expect(link({ target: { title: 'Q', postId: 'p1' } })).toEqual({ commands: ['/forum', 'p1'], label: 'Voir la question' });
    });

    it('opens the parent question for a reported answer', () => {
      expect(link({ entityType: 'ANSWER', entityId: 'a1', target: { title: 'Q mère', postId: 'p9' } })).toEqual({
        commands: ['/forum', 'p9'],
        label: 'Voir la réponse dans sa question',
      });
    });

    it('opens the project by its slug', () => {
      expect(link({ entityType: 'PROJECT', target: { title: 'Wolof API', slug: 'wolof-api' } })).toEqual({
        commands: ['/projects', 'wolof-api'],
        label: 'Voir le projet',
      });
    });

    it('opens the offer for a reported job', () => {
      expect(link({ entityType: 'JOB', target: { title: 'Dev Angular', jobId: 'j1' } })).toEqual({
        commands: ['/jobs', 'j1'],
        label: 'Voir l\'offre',
      });
    });

    it('gives no link, and says so, once the content has been deleted', () => {
      moderation.listReports.mockReturnValue(of(page([{ ...REPORT, target: null }])));
      const fixture = create();
      expect(fixture.componentInstance.contentLink({ ...REPORT, target: null })).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('Ce contenu a été supprimé');
    });

    it('shows the title of the reported content and a readable type', () => {
      moderation.listReports.mockReturnValue(of(page([{ ...REPORT, entityType: 'JOB', target: { title: 'Dev Angular', jobId: 'j1' } }])));
      const text = create().nativeElement.textContent;
      expect(text).toContain('« Dev Angular »');
      expect(text).toContain('Offre');
      expect(text).toContain('Voir l\'offre');
    });
  });

  it('applies the chosen decision with the note, then reloads', () => {
    moderation.resolveReport.mockReturnValue(of({}));
    const fixture = create();
    const component = fixture.componentInstance;

    component.setResolution('r1', 'WARNING');
    component.setNote('r1', '  Premier avertissement ');
    component.resolve(REPORT);

    expect(moderation.resolveReport).toHaveBeenCalledWith('r1', 'WARNING', 'Premier avertissement');
    expect(toast.success).toHaveBeenCalled();
    expect(moderation.listReports).toHaveBeenCalledTimes(2);
  });

  it('hides the contents of a report by default', () => {
    moderation.resolveReport.mockReturnValue(of({}));
    const fixture = create();

    fixture.componentInstance.resolve(REPORT);

    expect(moderation.resolveReport).toHaveBeenCalledWith('r1', 'HIDDEN', undefined);
  });

  it('reloads with the selected status and offers no action on closed reports', () => {
    moderation.listReports.mockReturnValue(of(page([{ ...REPORT, status: 'RESOLVED' }])));
    const fixture = create();

    fixture.componentInstance.selectStatus('RESOLVED');
    fixture.detectChanges();

    expect(moderation.listReports).toHaveBeenLastCalledWith('RESOLVED', 1);
    expect(fixture.nativeElement.textContent).not.toContain('Appliquer');
  });

  it('shows an error toast when the decision fails', () => {
    moderation.dismissReport.mockReturnValue(throwError(() => ({ status: 404, error: { error: { message: 'Signalement introuvable.' } } })));
    const fixture = create();

    fixture.componentInstance.dismiss(REPORT);

    expect(toast.error).toHaveBeenCalledWith('Signalement introuvable.');
  });
});
