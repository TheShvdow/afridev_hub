import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MentorListComponent } from './mentor-list.component';

describe('MentorListComponent', () => {
  let component: MentorListComponent;
  let fixture: ComponentFixture<MentorListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentorListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MentorListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all mentors by default', () => {
    const cards = fixture.nativeElement.querySelectorAll('app-card-mentor');
    expect(cards.length).toBe(component.mentors.length);
  });

  it('should filter mentors by specialty', () => {
    component.selectedSpecialty.set('Flutter');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-mentor');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Eleanor Pena');
  });

  it('should filter mentors by availability slot', () => {
    component.selectedSlot.set('demain');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-mentor');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Data Scientist');
  });
});
