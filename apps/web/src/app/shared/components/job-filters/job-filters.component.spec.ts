import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobFiltersComponent } from './job-filters.component';

describe('JobFiltersComponent', () => {
  let component: JobFiltersComponent;
  let fixture: ComponentFixture<JobFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JobFiltersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('countries', ['Tous les pays', 'Togo']);
    fixture.componentRef.setInput('workTypes', ['Tous', 'Remote']);
    fixture.componentRef.setInput('currencies', ['Tout', 'EUR']);
    fixture.componentRef.setInput('selectedCountry', 'Tous les pays');
    fixture.componentRef.setInput('selectedWorkType', 'Tous');
    fixture.componentRef.setInput('selectedCurrency', 'Tout');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render one option per country', () => {
    const options = fixture.nativeElement.querySelectorAll('option');
    expect(options.length).toBe(2);
  });

  it('should update the selected work type on click', () => {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons[1].click();
    fixture.detectChanges();

    expect(component.selectedWorkType()).toBe('Remote');
  });
});
