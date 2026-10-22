import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardJobComponent, Job } from './card-job.component';

describe('CardJobComponent', () => {
  let component: CardJobComponent;
  let fixture: ComponentFixture<CardJobComponent>;

  const job: Job = {
    logo: 'assets/images/wave.png',
    company: 'Wave',
    title: 'Développeur·se Full-Stack',
    location: 'Dakar, Sénégal',
    country: 'Sénégal',
    type: 'CDI · Hybride',
    mode: 'Hybride',
    experience: '3+ ans',
    skills: ['React', 'Node'],
    salary: '1,2 – 1,8 M FCFA',
    currency: 'Local',
    posted: 'Publiée il y a 2 j',
    description: 'Description',
    missions: ['Mission'],
    profile: ['Profil'],
    benefits: ['Avantage'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardJobComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardJobComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('job', job);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the job title and company', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Développeur·se Full-Stack');
    expect(element.textContent).toContain('Wave');
  });
});
