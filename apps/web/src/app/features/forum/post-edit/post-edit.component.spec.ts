import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { PostEditComponent } from './post-edit.component';
import { ForumPostDetail, ForumService } from '../../../core/services/forum.service';
import { AuthStore } from '../../../core/store/auth.store';

const DETAIL: ForumPostDetail = {
  id: 'post-1',
  title: 'Comment configurer Nx avec Angular 18 + SSR ?',
  userId: 'user-1',
  body: "J'essaie de configurer Nx avec Angular 18 et le SSR depuis deux jours.",
  viewCount: 12,
  isResolved: false,
  voteScore: 3,
  lastActivityAt: new Date().toISOString(),
  isHidden: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    username: 'idy_dev',
    displayName: 'Idrissa Wade',
    avatarUrl: null,
    reputation: 15,
  },
  postTags: [
    { tag: { name: 'Nx', slug: 'nx' } },
    { tag: { name: 'Angular', slug: 'angular' } },
  ],
  _count: { answers: 0 },
  answers: [],
};

const forumStub = {
  getPost: jest.fn(() => of(DETAIL)),
  updatePost: jest.fn(() => of(DETAIL)),
};

const authStub = {
  currentUser: jest.fn(() => ({ id: 'user-1' })),
};

describe('PostEditComponent', () => {
  let fixture: ComponentFixture<PostEditComponent>;
  let component: PostEditComponent;
  let router: Router;

  beforeEach(async () => {
    forumStub.getPost.mockClear();
    forumStub.updatePost.mockClear();
    authStub.currentUser.mockReturnValue({ id: 'user-1' });

    await TestBed.configureTestingModule({
      imports: [PostEditComponent],
      providers: [
        provideRouter([]),
        { provide: ForumService, useValue: forumStub },
        { provide: AuthStore, useValue: authStub },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: DETAIL.id })) },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(PostEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should prefill the form with the current question', () => {
    expect(forumStub.getPost).toHaveBeenCalledWith(DETAIL.id);
    expect(component.form.getRawValue()).toEqual({
      title: DETAIL.title,
      body: DETAIL.body,
      tags: ['Nx', 'Angular'],
    });
    expect(fixture.nativeElement.textContent).toContain('Modifier la question');
  });

  it('should send the changes with PATCH and navigate back to the question', () => {
    component.submit();

    expect(forumStub.updatePost).toHaveBeenCalledWith(DETAIL.id, {
      title: DETAIL.title,
      body: DETAIL.body,
      tags: ['Nx', 'Angular'],
    });
    expect(router.navigate).toHaveBeenCalledWith(['/forum', DETAIL.id]);
  });

  it('should forbid editing a question owned by another user', () => {
    authStub.currentUser.mockReturnValue({ id: 'user-2' });

    const forbiddenFixture = TestBed.createComponent(PostEditComponent);
    forbiddenFixture.detectChanges();

    expect(forbiddenFixture.nativeElement.textContent).toContain('Modification impossible');
    expect(forbiddenFixture.nativeElement.textContent).toContain(
      "Seul l'auteur de la question peut la modifier.",
    );

    forbiddenFixture.destroy();
  });
});
