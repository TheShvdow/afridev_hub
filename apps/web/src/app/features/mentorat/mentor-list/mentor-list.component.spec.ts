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
    expect(cards).toHaveLength(component.mentors.length);
  });

  it('should filter mentors by specialty', () => {
    component.selectedSpecialty.set('Flutter');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-mentor');
    expect(cards).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Eleanor Pena');
  });

  it('should filter mentors by availability slot', () => {
    component.selectedSlot.set('demain');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-mentor');
    expect(cards).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Data Scientist');
  });

  it('shows the preview banner and offers no booking', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-preview-banner')?.textContent).toContain('Le mentorat arrive bientôt');
    // Les filtres fonctionnent sur les exemples ; seules la réservation et « Charger plus » sont indisponibles.
    const booking = Array.from(root.querySelectorAll('app-card-mentor button')) as HTMLButtonElement[];
    const loadMore = Array.from(root.querySelectorAll('button')).find((button) => button.textContent?.includes('Charger plus'));
    expect(booking.length).toBeGreaterThan(0);
    expect(booking.every((button) => button.disabled)).toBe(true);
    expect(loadMore?.disabled).toBe(true);
  });
});

