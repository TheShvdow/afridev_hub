import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobListComponent } from './job-list.component';

describe('JobListComponent', () => {
  let component: JobListComponent;
  let fixture: ComponentFixture<JobListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JobListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all jobs by default', () => {
    const cards = fixture.nativeElement.querySelectorAll('app-card-job');
    expect(cards.length).toBe(component.jobs.length);
  });

  it('should filter jobs by country', () => {
    component.selectedCountry.set('Togo');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-job');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Gozem');
  });

  it('should filter jobs by work type', () => {
    component.selectedWorkType.set('Remote');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-job');
    expect(cards.length).toBe(1);
  });

  it('should filter jobs by currency', () => {
    component.selectedCurrency.set('EUR');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-job');
    expect(cards.length).toBe(1);
  });

  it('should open the detail panel when a card is selected', () => {
    component.openJob(component.jobs[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-job-detail-panel')).toBeTruthy();
  });
});
