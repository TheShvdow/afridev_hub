import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ReportButtonComponent } from './report-button.component';
import { ModerationService } from '../../../core/services/moderation.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';

describe('ReportButtonComponent', () => {
  const moderation = { report: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };
  const auth = { currentUser: jest.fn() };

  function create(authorId = 'author-1') {
    TestBed.configureTestingModule({
      imports: [ReportButtonComponent],
      providers: [
        { provide: ModerationService, useValue: moderation },
        { provide: AuthStore, useValue: auth },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(ReportButtonComponent);
    fixture.componentRef.setInput('entityType', 'POST');
    fixture.componentRef.setInput('entityId', 'post-1');
    fixture.componentRef.setInput('authorId', authorId);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    auth.currentUser.mockReturnValue({ id: 'me', role: 'MEMBER' });
  });

  it('is hidden for guests and for the author of the content', () => {
    auth.currentUser.mockReturnValue(null);
    expect(create().nativeElement.querySelector('button')).toBeNull();

    TestBed.resetTestingModule();
    auth.currentUser.mockReturnValue({ id: 'author-1', role: 'MEMBER' });
    expect(create().nativeElement.querySelector('button')).toBeNull();
  });

  it('sends the reason and trimmed details, then locks the button', () => {
    moderation.report.mockReturnValue(of({}));
    const fixture = create();
    const component = fixture.componentInstance;
    component.toggle();
    component.form.setValue({ reason: 'OFFENSIVE', details: '  Insultes  ' });

    component.submit();
    fixture.detectChanges();

    expect(moderation.report).toHaveBeenCalledWith({
      entityType: 'POST',
      entityId: 'post-1',
      reason: 'OFFENSIVE',
      details: 'Insultes',
    });
    expect(component.sent()).toBe(true);
    expect(fixture.nativeElement.querySelector('button').textContent).toContain('Signalé');
  });

  it('treats an already-reported content (409) as sent and tells the member', () => {
    moderation.report.mockReturnValue(
      throwError(() => ({ status: 409, error: { error: { code: 'MODERATION_REPORT_DUPLICATE', message: 'Vous avez déjà signalé ce contenu.' } } })),
    );
    const fixture = create();
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.sent()).toBe(true);
    expect(toast.error).toHaveBeenCalledWith('Vous avez déjà signalé ce contenu.');
  });

  it('keeps the form open and shows the message on other errors', () => {
    moderation.report.mockReturnValue(throwError(() => ({ status: 404, error: { error: { message: 'Contenu introuvable.' } } })));
    const fixture = create();
    fixture.componentInstance.toggle();
    fixture.componentInstance.submit();

    expect(fixture.componentInstance.sent()).toBe(false);
    expect(fixture.componentInstance.errorMessage()).toBe('Contenu introuvable.');
  });
});
