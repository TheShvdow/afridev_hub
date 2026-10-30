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
