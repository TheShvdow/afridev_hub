import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ForumFiltersComponent } from './forum-filters.component';

describe('ForumFiltersComponent', () => {
  let component: ForumFiltersComponent;
  let fixture: ComponentFixture<ForumFiltersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ForumFiltersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ForumFiltersComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tags', ['Tout', 'Backend']);
    fixture.componentRef.setInput('selectedTag', 'Tout');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update the selected tag on click', () => {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons[1].click();
    fixture.detectChanges();

    expect(component.selectedTag()).toBe('Backend');
  });
});
