import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PostListComponent } from './post-list.component';
import { ForumPost, ForumService, ListPostsQuery } from '../../../core/services/forum.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { VotesService } from '../../../core/services/votes.service';
import { AuthStore } from '../../../core/store/auth.store';

function makePost(overrides: Partial<ForumPost> = {}): ForumPost {
  return {
    id: 'post-1',
    title: 'Comment gérer les paiements Mobile Money dans une API Node ?',
    viewCount: 12,
    isResolved: false,
    voteScore: 19,
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-1',
      username: 'aminata',
      displayName: 'Aminata D.',
      avatarUrl: null,
      reputation: 42,
    },
    postTags: [{ tag: { name: 'Backend', slug: 'backend' } }],
    _count: { answers: 3 },
    ...overrides,
  };
}

const POSTS: ForumPost[] = [
  makePost(),
  makePost({
    id: 'post-2',
    title: "Retour d'expérience : passer de freelance à CTO d'une fintech",
    postTags: [{ tag: { name: 'Carrière', slug: 'carriere' } }],
    _count: { answers: 5 },
  }),
];

const listPostsCalls: ListPostsQuery[] = [];

const forumStub = {
  listPosts(query: ListPostsQuery = {}) {
    listPostsCalls.push(query);
    const data = query.tag
      ? POSTS.filter((post) => post.postTags.some((link) => link.tag.name === query.tag))
      : POSTS;

    return of({
      data,
      meta: { total: data.length, page: query.page ?? 1, limit: query.limit ?? 20, totalPages: 1 },
    });
  },
  // La modale charge la question complète à son ouverture.
  getPost(id: string) {
    const post = POSTS.find((item) => item.id === id) ?? POSTS[0];
    return of({
      ...post,
      userId: post.user.id,
      body: 'Contenu de la question.',
      isHidden: false,
      updatedAt: post.createdAt,
      answers: [],
    });
  },
};

describe('PostListComponent', () => {
  let component: PostListComponent;
  let fixture: ComponentFixture<PostListComponent>;

  beforeEach(async () => {
    listPostsCalls.length = 0;
    await TestBed.configureTestingModule({
      imports: [PostListComponent],
      providers: [
        provideRouter([]),
        { provide: ForumService, useValue: forumStub },
        { provide: VotesService, useValue: { votePost: jest.fn(), voteAnswer: jest.fn() } },
        { provide: ModerationService, useValue: { report: jest.fn() } },
        { provide: AuthStore, useValue: { currentUser: () => null, isAuthenticated: () => false } },
      ],
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
    expect(cards.length).toBe(POSTS.length);
  });

  it('should filter threads by tag', () => {
    component.selectTag('Carrière');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-card-thread');
    expect(cards.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('passer de freelance à CTO');
  });

  it('should update the vote count of a card when the modal reports a new score', () => {
    component.updateScore({ id: 'post-1', score: 42 });
    fixture.detectChanges();

    expect(component.threads().find((thread) => thread.id === 'post-1')?.votes).toBe('42');
    expect(component.threads().find((thread) => thread.id === 'post-2')?.votes).toBe('19');
  });

  it('should open the discussion modal when a thread is opened', () => {
    component.openThread(component.threads()[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-thread-modal')).toBeTruthy();
  });

  describe('recherche', () => {
    it('envoie le texte saisi à l\'API après la pause de frappe', () => {
      jest.useFakeTimers();
      try {
        component.onSearchInput('mobile money');
        jest.advanceTimersByTime(200);
        expect(listPostsCalls.some((call) => call.search)).toBe(false);

        jest.advanceTimersByTime(200);
        expect(listPostsCalls.at(-1)?.search).toBe('mobile money');
        expect(component.appliedSearch()).toBe('mobile money');
      } finally {
        jest.useRealTimers();
      }
    });

    it('ignore une saisie d\'un seul caractère', () => {
      jest.useFakeTimers();
      try {
        component.onSearchInput('m');
        jest.advanceTimersByTime(500);
        expect(component.appliedSearch()).toBe('');
      } finally {
        jest.useRealTimers();
      }
    });

    it('applique la recherche tout de suite sur Entrée', () => {
      component.onSearchInput('paiement');
      component.submitSearch();
      expect(listPostsCalls.at(-1)?.search).toBe('paiement');
    });

    it('efface la recherche et recharge la liste complète', () => {
      component.onSearchInput('paiement');
      component.submitSearch();
      component.clearSearch();

      expect(component.search()).toBe('');
      expect(component.appliedSearch()).toBe('');
      expect(listPostsCalls.at(-1)?.search).toBeUndefined();
    });
  });
});
