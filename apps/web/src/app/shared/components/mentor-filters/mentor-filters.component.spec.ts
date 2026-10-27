import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentorFiltersComponent } from './mentor-filters.component';

describe('MentorFiltersComponent', () => {
  let component: MentorFiltersComponent;
  let fixture: ComponentFixture<MentorFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MentorFiltersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('specialties', ['Toutes', 'Flutter']);
    fixture.componentRef.setInput('slots', [
      { value: 'Tous', label: 'Tous' },
      { value: 'demain', label: 'Disponible demain' },
    ]);
    fixture.componentRef.setInput('selectedSpecialty', 'Toutes');
    fixture.componentRef.setInput('selectedSlot', 'Tous');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update the selected specialty on click', () => {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons[1].click();
    fixture.detectChanges();

    expect(component.selectedSpecialty()).toBe('Flutter');
  });

  it('should update the selected slot on click', () => {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons[3].click();
    fixture.detectChanges();

    expect(component.selectedSlot()).toBe('demain');
  });
});
