import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PostDetailComponent } from './post-detail.component';
import { ForumPostDetail, ForumService } from '../../../core/services/forum.service';
import { AuthStore } from '../../../core/store/auth.store';

const DETAIL: ForumPostDetail = {
  id: 'post-1',
  title: 'Comment configurer Nx avec Angular 18 + SSR ?',
  userId: 'user-1',
  body: "J'essaie de configurer Nx avec Angular 18 et le SSR depuis deux jours.",
  viewCount: 12,
  isResolved: true,
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
  postTags: [{ tag: { name: 'NestJS', slug: 'nestjs' } }],
  _count: { answers: 1 },
  answers: [
    {
      id: 'answer-1',
      body: 'Ajoute le builder @angular-devkit/build-angular:ssr-dev-server dans angular.json.',
      isAccepted: true,
      voteScore: 1,
      isHidden: false,
      createdAt: new Date().toISOString(),
      user: {
        id: 'user-2',
        username: 'kwame',
        displayName: 'Kwame A.',
        avatarUrl: null,
        reputation: 42,
      },
    },
  ],
};

const forumStub = {
  getPost: jest.fn(() => of(DETAIL)),
  deletePost: jest.fn(() => of(undefined)),
  deleteAnswer: jest.fn(() => of(undefined)),
};

const authStub = {
  currentUser: jest.fn(() => ({ id: DETAIL.userId, role: 'MEMBER' })),
  isAuthenticated: jest.fn(() => true),
};

describe('PostDetailComponent', () => {
  let fixture: ComponentFixture<PostDetailComponent>;
  let router: Router;

  beforeEach(async () => {
    forumStub.getPost.mockClear();
    forumStub.deletePost.mockClear();
    forumStub.deleteAnswer.mockClear();
    authStub.currentUser.mockReturnValue({ id: DETAIL.userId, role: 'MEMBER' });

    await TestBed.configureTestingModule({
      imports: [PostDetailComponent],
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
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture = TestBed.createComponent(PostDetailComponent);
    fixture.detectChanges();
  });

  it('should render the question and its answers', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(forumStub.getPost).toHaveBeenCalledWith(DETAIL.id);
    expect(text).toContain(DETAIL.title);
    expect(text).toContain('NestJS');
    expect(text).toContain('Idrissa Wade');
    expect(text).toContain(DETAIL.answers[0].body);
    expect(text).toContain('Réponse acceptée');
  });

  it('should show an edit link to the question owner', () => {
    const link = fixture.nativeElement.querySelector(
      `a[href="/forum/${DETAIL.id}/edit"]`,
    ) as HTMLAnchorElement | null;

    expect(link?.textContent).toContain('Modifier');
  });

  it('should let a moderator delete the question without allowing edits', () => {
    authStub.currentUser.mockReturnValue({ id: 'mod-1', role: 'MODERATOR' });

    const moderatorFixture = TestBed.createComponent(PostDetailComponent);
    moderatorFixture.detectChanges();

    expect(
      moderatorFixture.nativeElement.querySelector('[aria-label="Supprimer la question"]'),
    ).toBeTruthy();
    expect(
      moderatorFixture.nativeElement.querySelector(`a[href="/forum/${DETAIL.id}/edit"]`),
    ).toBeNull();

    moderatorFixture.destroy();
  });

  it('should delete the question after confirmation', () => {
    const deleteButton = fixture.nativeElement.querySelector(
      '[aria-label="Supprimer la question"]',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Supprimer cette question ?');

    const confirmButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Supprimer définitivement'));
    confirmButton?.click();
    fixture.detectChanges();

    expect(forumStub.deletePost).toHaveBeenCalledWith(DETAIL.id);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/forum');
  });

  it('should delete an answer after confirmation', () => {
    authStub.currentUser.mockReturnValue({ id: DETAIL.answers[0].user.id, role: 'MEMBER' });

    const answerAuthorFixture = TestBed.createComponent(PostDetailComponent);
    answerAuthorFixture.detectChanges();

    const answers = answerAuthorFixture.nativeElement.querySelectorAll('article');
    const answerArticle = answers[1] as HTMLElement;

    const deleteButton = Array.from(answerArticle.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Supprimer',
    ) as HTMLButtonElement;
    deleteButton.click();
    answerAuthorFixture.detectChanges();

    const confirmButton = Array.from(answerArticle.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Supprimer',
    ) as HTMLButtonElement;
    confirmButton.click();
    answerAuthorFixture.detectChanges();

    expect(forumStub.deleteAnswer).toHaveBeenCalledWith(DETAIL.answers[0].id);
    expect(answerAuthorFixture.componentInstance.post()?.answers).toHaveLength(0);

    answerAuthorFixture.destroy();
  });

  it('should show a not-found message for a 404 response', () => {
    forumStub.getPost.mockReturnValueOnce(throwError(() => ({ status: 404 })));

    const notFoundFixture = TestBed.createComponent(PostDetailComponent);
    notFoundFixture.detectChanges();

    expect(notFoundFixture.nativeElement.textContent).toContain('Question introuvable');

    notFoundFixture.destroy();
  });
});
