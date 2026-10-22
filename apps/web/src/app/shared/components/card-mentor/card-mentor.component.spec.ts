import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardMentorComponent, Mentor } from './card-mentor.component';

describe('CardMentorComponent', () => {
  let component: CardMentorComponent;
  let fixture: ComponentFixture<CardMentorComponent>;

  const mentor: Mentor = {
    name: 'Awa Diallo',
    role: 'Staff Engineer · Backend',
    start: '4.9(42)',
    tags: ['Go', 'Node'],
    availability: '3 créneaux cette semaine',
    price: '15 000 FCFA / 45 min',
    flag: 'sn',
    avatar: 'assets/images/awa.png',
    slot: 'cette-semaine',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardMentorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardMentorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mentor', mentor);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the mentor name and role', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Awa Diallo');
    expect(element.textContent).toContain('Staff Engineer · Backend');
  });
});
