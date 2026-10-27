import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ThreadModalComponent } from './thread-modal.component';
import { Thread } from '../card-thread/card-thread.component';
import { ForumAnswer, ForumPostDetail, ForumService } from '../../../core/services/forum.service';
import { VotesService } from '../../../core/services/votes.service';
import { AuthStore } from '../../../core/store/auth.store';

const THREAD: Thread = {
  id: 'post-1',
  initials: 'ID',
  tags: ['NestJS'],
  title: 'Comment configurer Nx avec Angular 18 + SSR ?',
  meta: 'Idrissa Wade · il y a 2 h',
  votes: '3',
  replies: '1',
  body: '',
  comments: [],
};

const DETAIL: ForumPostDetail = {
  id: THREAD.id,
  title: THREAD.title,
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
  postTags: [{ tag: { name: 'NestJS', slug: 'nestjs' } }],
  _count: { answers: 1 },
  answers: [
    {
      id: 'answer-1',
      body: 'Ajoute le builder SSR dans angular.json.',
      isAccepted: false,
      voteScore: 0,
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

const ANSWER: ForumAnswer = {
  id: 'answer-2',
  body: 'Il faut aussi vérifier la configuration du serveur Express.',
  isAccepted: false,
  voteScore: 0,
  isHidden: false,
  createdAt: new Date().toISOString(),
  user: {
    id: 'user-1',
    username: 'idy_dev',
    displayName: 'Idrissa Wade',
    avatarUrl: null,
    reputation: 15,
  },
};

const forumStub = {
  getPost: jest.fn(() => of(DETAIL)),
  createAnswer: jest.fn(() => of(ANSWER)),
  deleteAnswer: jest.fn(() => of(undefined)),
};

const authStub = {
  currentUser: jest.fn(() => ({ id: 'user-2', role: 'MEMBER' })),
  isAuthenticated: jest.fn(() => true),
};

describe('ThreadModalComponent', () => {
  let fixture: ComponentFixture<ThreadModalComponent>;

  beforeEach(async () => {
    forumStub.getPost.mockClear();
    forumStub.createAnswer.mockClear();
    forumStub.deleteAnswer.mockClear();
    authStub.isAuthenticated.mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [ThreadModalComponent],
      providers: [
        provideRouter([]),
        { provide: ForumService, useValue: forumStub },
        { provide: AuthStore, useValue: authStub },
        { provide: VotesService, useValue: { votePost: jest.fn(), voteAnswer: jest.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThreadModalComponent);
    fixture.componentRef.setInput('thread', THREAD);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('should load the question detail when the modal opens', () => {
    expect(forumStub.getPost).toHaveBeenCalledWith(THREAD.id);
    expect(fixture.nativeElement.textContent).toContain(DETAIL.body);
  });

  it('should show the answer form to an authenticated user', () => {
    const input = fixture.nativeElement.querySelector(
      'input[formControlName="body"]',
    ) as HTMLInputElement | null;

    expect(input).toBeTruthy();
  });

  it('should hide the answer form for a guest', () => {
    authStub.isAuthenticated.mockReturnValue(false);

    const guestFixture = TestBed.createComponent(ThreadModalComponent);
    guestFixture.componentRef.setInput('thread', THREAD);
    guestFixture.detectChanges();
    guestFixture.detectChanges();

    expect(
      guestFixture.nativeElement.querySelector('input[formControlName="body"]'),
    ).toBeNull();
    expect(guestFixture.nativeElement.textContent).toContain('Connectez-vous');

    guestFixture.destroy();
  });

  it('should publish an answer and append it to the discussion', () => {
    const component = fixture.componentInstance;
    component.answerForm.setValue({
      body: 'Il faut aussi vérifier la configuration du serveur Express.',
    });

    component.submitAnswer();
    fixture.detectChanges();

    expect(forumStub.createAnswer).toHaveBeenCalledWith(DETAIL.id, {
      body: 'Il faut aussi vérifier la configuration du serveur Express.',
    });
    expect(component.post()?.answers.length).toBe(DETAIL.answers.length + 1);
    expect(fixture.nativeElement.textContent).toContain(ANSWER.body);
  });

  it('should refuse an answer shorter than 30 characters', () => {
    const component = fixture.componentInstance;
    forumStub.createAnswer.mockClear();
    component.answerForm.setValue({ body: '   Trop court.   ' });

    component.submitAnswer();

    expect(component.answerForm.controls.body.hasError('minlength')).toBe(true);
    expect(forumStub.createAnswer).not.toHaveBeenCalled();
  });

  it('should delete an answer authored by the current user', () => {
    const component = fixture.componentInstance;
    component.requestAnswerDelete(DETAIL.answers[0].id);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Supprimer cette réponse ?');

    component.deleteAnswer(DETAIL.answers[0].id);
    fixture.detectChanges();

    expect(forumStub.deleteAnswer).toHaveBeenCalledWith(DETAIL.answers[0].id);
    expect(component.post()?.answers).toHaveLength(0);
    expect(component.post()?._count.answers).toBe(0);
  });
});
