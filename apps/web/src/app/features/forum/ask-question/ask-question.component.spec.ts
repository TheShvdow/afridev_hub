import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AskQuestionComponent } from './ask-question.component';
import { ForumService } from '../../../core/services/forum.service';
import { QuestionFieldsComponent } from '../question-fields/question-fields.component';

const forumStub = {
  findSimilar: jest.fn(() =>
    of([
      {
        id: 'post-2',
        title: 'Comment configurer Nx avec Angular 18 ?',
        isResolved: true,
        similarity: 0.72,
      },
    ]),
  ),
  createPost: jest.fn(() =>
    of({
      id: 'post-1',
      title: 'Comment configurer Nx avec Angular 18 + SSR ?',
      viewCount: 0,
      isResolved: false,
      voteScore: 0,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      user: {
        id: 'user-1',
        username: 'idy_dev',
        displayName: 'Idrissa Wade',
        avatarUrl: null,
        reputation: 15,
      },
      postTags: [],
      _count: { answers: 0 },
    }),
  ),
};

describe('AskQuestionComponent', () => {
  let component: AskQuestionComponent;
  let fixture: ComponentFixture<AskQuestionComponent>;
  let router: Router;

  // Les tags se saisissent dans le composant de champs partagé.
  const fields = (): QuestionFieldsComponent =>
    fixture.debugElement.query(By.directive(QuestionFieldsComponent)).componentInstance;

  beforeEach(async () => {
    forumStub.findSimilar.mockClear();
    forumStub.createPost.mockClear();

    await TestBed.configureTestingModule({
      imports: [AskQuestionComponent],
      providers: [
        provideRouter([]),
        { provide: ForumService, useValue: forumStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AskQuestionComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit an invalid form', () => {
    component.submit();

    expect(forumStub.createPost).not.toHaveBeenCalled();
    expect(component.form.controls.title.touched).toBe(true);
    expect(component.form.controls.tags.touched).toBe(true);
  });

  it('should suggest similar questions while the title is typed', fakeAsync(() => {
    component.form.controls.title.setValue('Comment configurer Nx avec Angular');
    tick(400);
    fixture.detectChanges();

    expect(forumStub.findSimilar).toHaveBeenCalledWith('Comment configurer Nx avec Angular');
    expect(component.similarPosts()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Comment configurer Nx avec Angular 18 ?');
  }));

  it('should send the question and navigate back to the forum', fakeAsync(() => {
    component.form.controls.title.setValue('Comment configurer Nx avec Angular 18 + SSR ?');
    component.form.controls.body.setValue(
      "J'essaie de configurer Nx avec Angular 18 et le SSR, mais le build échoue sans message clair.",
    );
    fields().tagInput.setValue('angular');
    fields().addTag();

    tick(400);
    component.submit();

    expect(forumStub.createPost).toHaveBeenCalledWith({
      title: 'Comment configurer Nx avec Angular 18 + SSR ?',
      body: "J'essaie de configurer Nx avec Angular 18 et le SSR, mais le build échoue sans message clair.",
      tags: ['angular'],
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/forum');

    tick(5000);
  }));

  it('should not add more than five tags', () => {
    for (const tag of ['a', 'b', 'c', 'd', 'e', 'f']) {
      fields().tagInput.setValue(tag);
      fields().addTag();
    }

    expect(component.form.controls.tags.value).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
