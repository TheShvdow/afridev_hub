import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobApplyComponent } from './job-apply.component';
import { JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';

describe('JobApplyComponent', () => {
  const jobs = { apply: jest.fn() };
  const toast = { success: jest.fn() };

  function create() {
    TestBed.configureTestingModule({
      imports: [JobApplyComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: ToastService, useValue: toast },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', 'job-1']]) } } },
      ],
    });
    const fixture = TestBed.createComponent(JobApplyComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(() => jest.clearAllMocks());

  it('refuses an empty or blank message', () => {
    const component = create();
    component.form.setValue({ message: '   ' });

    component.submit();

    expect(jobs.apply).not.toHaveBeenCalled();
    expect(component.form.controls.message.invalid).toBe(true);
  });

  it('sends the trimmed message and goes back to the offer', () => {
    jobs.apply.mockReturnValue(of({ id: 'a1' }));
    const component = create();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.form.setValue({ message: '  Motivé par ce poste.  ' });

    component.submit();

    expect(jobs.apply).toHaveBeenCalledWith('job-1', { message: 'Motivé par ce poste.' });
    expect(toast.success).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/jobs', 'job-1']);
  });

  it('shows the API message when already applied', () => {
    jobs.apply.mockReturnValue(
      throwError(() => ({ status: 409, error: { error: { code: 'JOBS_ALREADY_APPLIED', message: 'Vous avez déjà postulé à cette offre.' } } })),
    );
    const component = create();
    component.form.setValue({ message: 'Bonjour' });

    component.submit();

    expect(component.errorMessage()).toBe('Vous avez déjà postulé à cette offre.');
  });
});
