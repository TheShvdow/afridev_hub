import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PostListComponent } from './post-list.component';

describe('PostListComponent', () => {
  let component: PostListComponent;
  let fixture: ComponentFixture<PostListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostListComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PostListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render all threads by default', () => {
    const cards = fixture.nativeElement.querySelectorAll('app-card-thread');
    expect(cards.length).toBe(component.threads.length);
  });

  it('should filter threads by tag', () => {
    component.selectedTag.set('Carrière');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-thread');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain("passer de freelance à CTO");
  });

  it('should open the discussion modal when a thread is opened', () => {
    component.openThread(component.threads[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-thread-modal')).toBeTruthy();
  });
});
