import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardThreadComponent, Thread } from './card-thread.component';

describe('CardThreadComponent', () => {
  let component: CardThreadComponent;
  let fixture: ComponentFixture<CardThreadComponent>;

  const thread: Thread = {
    id: 'post-1',
    initials: 'AD',
    tags: ['Backend', '#Sénégal'],
    title: 'Comment gérer les paiements Mobile Money ?',
    meta: 'Aminata D. · Dakar · il y a 12 min',
    votes: '19',
    replies: '24',
    body: 'Corps du fil',
    comments: [],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CardThreadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CardThreadComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('thread', thread);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the thread title', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('Comment gérer les paiements Mobile Money ?');
  });
});
