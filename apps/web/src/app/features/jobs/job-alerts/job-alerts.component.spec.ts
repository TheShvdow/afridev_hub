import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { JobAlertsComponent } from './job-alerts.component';
import { CountriesService } from '../../../core/services/countries.service';
import { JobAlert, JobsService } from '../../../core/services/jobs.service';
import { ToastService } from '../../../core/services/toast.service';

function alert(id: string, overrides: Partial<JobAlert> = {}): JobAlert {
  return { id, country: 'SN', mode: 'REMOTE', stack: ['angular'], salaryMin: null, currency: null, isActive: true, createdAt: new Date().toISOString(), ...overrides };
}

describe('JobAlertsComponent', () => {
  const jobs = { listAlerts: jest.fn(), createAlert: jest.fn(), deleteAlert: jest.fn() };
  const toast = { success: jest.fn(), error: jest.fn() };

  function create(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [JobAlertsComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: jobs },
        { provide: ToastService, useValue: toast },
        { provide: CountriesService, useValue: { list: () => of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    const fixture = TestBed.createComponent(JobAlertsComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jobs.listAlerts.mockReturnValue(of([alert('a1', { salaryMin: 300000, currency: 'XOF' })]));
  });

  it('lists my alerts with a readable summary of their criteria', () => {
    const text = create().nativeElement.textContent as string;

    expect(text).toContain('1 sur 5 alertes');
    expect(text).toContain('Sénégal');
    expect(text).toContain('Remote');
    expect(text).toContain('angular');
    expect(text).toMatch(/à partir de 300\s000 XOF/);
  });

  it('prefills the country and mode from the filters of the job list', () => {
    const component = create({ country: 'SN', mode: 'HYBRID' }).componentInstance;

    expect(component.form.controls.country.value).toBe('SN');
    expect(component.form.controls.mode.value).toBe('HYBRID');
  });

  it('creates an alert with the filled criteria only and adds it to the list', () => {
    jobs.createAlert.mockReturnValue(of(alert('a2', { country: null, mode: null, stack: ['nestjs', 'docker'] })));
    const component = create().componentInstance;
    component.form.patchValue({ stack: ' NestJS, Docker, nestjs ' });

    component.submit();

    expect(jobs.createAlert).toHaveBeenCalledWith({
      country: undefined,
      mode: undefined,
      stack: ['NestJS', 'Docker'],
      salaryMin: undefined,
      currency: undefined,
    });
    expect(component.alerts().map((item) => item.id)).toEqual(['a2', 'a1']);
    expect(toast.success).toHaveBeenCalled();
    expect(component.form.controls.stack.value).toBe('');
  });

  it('sends the currency only with a minimum salary', () => {
    jobs.createAlert.mockReturnValue(of(alert('a2')));
    const component = create().componentInstance;
    component.form.patchValue({ salaryMin: 500000, currency: 'EUR' });

    component.submit();

    expect(jobs.createAlert).toHaveBeenCalledWith(expect.objectContaining({ salaryMin: 500000, currency: 'EUR' }));
  });

  it('asks for at least one criterion', () => {
    const component = create().componentInstance;

    component.submit();

    expect(jobs.createAlert).not.toHaveBeenCalled();
    expect(component.formError()).toContain('au moins un critère');
  });

  it('refuses more than 5 technologies', () => {
    const component = create().componentInstance;
    component.form.patchValue({ stack: 'a, b, c, d, e, f' });

    component.submit();

    expect(component.form.controls.stack.hasError('stackTooMany')).toBe(true);
    expect(jobs.createAlert).not.toHaveBeenCalled();
  });

  it('blocks creation at 5 alerts', () => {
    jobs.listAlerts.mockReturnValue(of(Array.from({ length: 5 }, (_, index) => alert(`a${index}`))));
    const fixture = create();

    fixture.componentInstance.form.patchValue({ country: 'SN' });
    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(jobs.createAlert).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('limite de 5 alertes');
  });

  it('shows the API message when creation is refused', () => {
    jobs.createAlert.mockReturnValue(throwError(() => ({ status: 409, error: { error: { message: 'Maximum 5 alertes par membre.' } } })));
    const component = create().componentInstance;
    component.form.patchValue({ country: 'SN' });

    component.submit();

    expect(component.formError()).toBe('Maximum 5 alertes par membre.');
  });

  it('deletes an alert after confirmation', () => {
    jobs.deleteAlert.mockReturnValue(of(undefined));
    const component = create().componentInstance;

    component.askDelete(component.alerts()[0]);
    expect(jobs.deleteAlert).not.toHaveBeenCalled();

    component.confirmDelete(component.alerts()[0]);

    expect(jobs.deleteAlert).toHaveBeenCalledWith('a1');
    expect(component.alerts()).toHaveLength(0);
  });
});
