import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PostListComponent } from './post-list.component';
import { ForumPost, ForumService, ListPostsQuery } from '../../../core/services/forum.service';
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

const forumStub = {
  listPosts(query: ListPostsQuery = {}) {
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
    await TestBed.configureTestingModule({
      imports: [PostListComponent],
      providers: [
        provideRouter([]),
        { provide: ForumService, useValue: forumStub },
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

  it('should open the discussion modal when a thread is opened', () => {
    component.openThread(component.threads()[0]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-thread-modal')).toBeTruthy();
  });
});
