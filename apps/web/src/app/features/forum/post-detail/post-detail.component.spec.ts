import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { PostDetailComponent } from './post-detail.component';
import { ForumPostDetail, ForumService } from '../../../core/services/forum.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { VotesService } from '../../../core/services/votes.service';
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
  acceptAnswer: jest.fn(() => of({})),
};

const votesStub = {
  votePost: jest.fn(() => of({ action: 'added', newScore: 4 })),
  voteAnswer: jest.fn(() => of({ action: 'added', newScore: 2 })),
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
    forumStub.acceptAnswer.mockClear();
    votesStub.votePost.mockClear();
    votesStub.voteAnswer.mockClear();
    authStub.currentUser.mockReturnValue({ id: DETAIL.userId, role: 'MEMBER' });

    await TestBed.configureTestingModule({
      imports: [PostDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ForumService, useValue: forumStub },
        { provide: AuthStore, useValue: authStub },
        { provide: VotesService, useValue: votesStub },
        { provide: ModerationService, useValue: { report: jest.fn(() => of({})) } },
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
  it('should not offer to vote on the viewer\'s own question', () => {
    expect(fixture.nativeElement.querySelector('[aria-label="Voter pour cette question"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Voter pour cette réponse"]')).toBeTruthy();
  });

  it('should offer to report an answer of another member', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('app-report-button button') as NodeListOf<HTMLButtonElement>);

    // L'auteur de la question ne signale pas sa propre question, mais bien la réponse d'un autre membre.
    expect(buttons.map((button) => button.textContent?.trim())).toEqual(['Signaler']);
  });

  it('should vote on an answer and show the new score', () => {
    const button = fixture.nativeElement.querySelector('[aria-label="Voter pour cette réponse"]') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    expect(votesStub.voteAnswer).toHaveBeenCalledWith('answer-1', 'UP');
    expect(fixture.componentInstance.post()?.answers[0].voteScore).toBe(2);
  });

  it('should show the vote immediately, before the API answers', () => {
    const pending = new Subject<{ action: string; newScore: number }>();
    votesStub.voteAnswer.mockReturnValueOnce(pending as never);

    const button = fixture.nativeElement.querySelector('[aria-label="Voter pour cette réponse"]') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    // Score 1 → 2 et pouce plein dès le clic, sans attendre la réponse.
    expect(fixture.componentInstance.post()?.answers[0].voteScore).toBe(2);
    expect(button.getAttribute('aria-pressed')).toBe('true');

    pending.next({ action: 'added', newScore: 2 });
    fixture.detectChanges();
    expect(fixture.componentInstance.post()?.answers[0].userVote).toBe('UP');
  });

  it('should restore the previous score and thumb when the API refuses the vote', () => {
    votesStub.voteAnswer.mockReturnValueOnce(
      throwError(() => ({ status: 403, error: { error: { message: 'Il faut au moins 10 points de réputation pour voter.' } } })) as never,
    );

    (fixture.nativeElement.querySelector('[aria-label="Voter pour cette réponse"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    const answer = fixture.componentInstance.post()?.answers[0];
    expect(answer?.voteScore).toBe(1);
    expect(answer?.userVote ?? null).toBeNull();
  });

  it('should cancel an existing vote on a second click and switch it with +2', () => {
    const component = fixture.componentInstance;
    component.post.set({ ...DETAIL, answers: [{ ...DETAIL.answers[0], voteScore: 4, userVote: 'UP' }] });
    votesStub.voteAnswer
      .mockReturnValueOnce(of({ action: 'removed', newScore: 3 }) as never)
      .mockReturnValueOnce(of({ action: 'changed', newScore: 1 }) as never);

    component.voteOnAnswer(component.post()!.answers[0], 'UP');
    expect(component.post()?.answers[0]).toMatchObject({ voteScore: 3, userVote: null });

    component.voteOnAnswer(component.post()!.answers[0], 'DOWN');
    expect(component.post()?.answers[0]).toMatchObject({ voteScore: 1, userVote: 'DOWN' });
  });

  it('should let the question author accept another answer', () => {
    const component = fixture.componentInstance;
    const other = { ...DETAIL.answers[0], id: 'answer-2', isAccepted: false };
    component.post.set({ ...DETAIL, isResolved: false, answers: [{ ...DETAIL.answers[0], isAccepted: false }, other] });
    fixture.detectChanges();

    const accept = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .filter((button) => button.textContent?.includes('Accepter cette réponse'))[1];
    accept.click();
    fixture.detectChanges();

    expect(forumStub.acceptAnswer).toHaveBeenCalledWith('answer-2');
    expect(component.post()?.answers.map((answer) => answer.isAccepted)).toEqual([false, true]);
    expect(component.post()?.isResolved).toBe(true);
  });
});
