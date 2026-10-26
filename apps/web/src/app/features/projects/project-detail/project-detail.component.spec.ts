import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { ProjectDetailComponent } from './project-detail.component';
import { ProjectDetail, ProjectsService } from '../../../core/services/projects.service';
import { CountriesService } from '../../../core/services/countries.service';
import { AuthStore } from '../../../core/store/auth.store';

const PROJECT: ProjectDetail = {
  id: 'project-1',
  slug: 'afripay',
  name: 'AfriPay',
  description: 'Paiements mobiles unifiés pour les commerçants africains.',
  country: 'SN',
  repoUrl: 'https://github.com/acme/afripay',
  demoUrl: 'https://afripay.example.com',
  githubStars: 342,
  githubForks: 21,
  githubLanguage: 'TypeScript',
  githubLastPush: new Date().toISOString(),
  githubSyncedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  category: { name: 'Fintech', slug: 'fintech', icon: '💳' },
  user: {
    id: 'user-1',
    username: 'idy_dev',
    displayName: 'Idrissa Wade',
    avatarUrl: null,
    reputation: 15,
  },
  projectTags: [{ tag: { name: 'NestJS', slug: 'nestjs' } }],
  _count: { stars: 3 },
  ogMeta: {
    ogTitle: 'AfriPay — AfriDev Hub',
    ogDescription: 'Paiements mobiles unifiés pour les commerçants africains.',
    ogImage: 'https://opengraph.githubassets.com/1/acme/afripay',
    ogUrl: 'https://afridevhub.com/projects/afripay',
  },
  starredByViewer: false,
};

const projectsStub = {
  getProject: jest.fn(() => of(PROJECT)),
  deleteProject: jest.fn(() => of(undefined)),
  toggleStar: jest.fn(() => of({ starred: true, stars: 4 })),
  refreshProject: jest.fn(() => of({ ...PROJECT, githubImport: 'imported' as const })),
};

const countriesStub = {
  list: jest.fn(() =>
    of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]),
  ),
};

const authStub = {
  currentUser: jest.fn(() => null as { id: string; role?: string } | null),
  isAuthenticated: jest.fn(() => false),
};

describe('ProjectDetailComponent', () => {
  let fixture: ComponentFixture<ProjectDetailComponent>;

  beforeEach(async () => {
    projectsStub.getProject.mockClear();
    projectsStub.deleteProject.mockClear();
    projectsStub.toggleStar.mockClear();
    projectsStub.refreshProject.mockClear();
    countriesStub.list.mockClear();
    authStub.currentUser.mockReturnValue(null);
    authStub.isAuthenticated.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [ProjectDetailComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsStub },
        { provide: CountriesService, useValue: countriesStub },
        { provide: AuthStore, useValue: authStub },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ idOrSlug: PROJECT.slug })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDetailComponent);
    fixture.detectChanges();
  });

  it('should load and render the project by slug', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(projectsStub.getProject).toHaveBeenCalledWith(PROJECT.slug);
    expect(text).toContain('AfriPay');
    expect(text).toContain(PROJECT.description);
    expect(text).toContain('Fintech');
    expect(text).toContain('NestJS');
    expect(text).toContain('Idrissa Wade');
    expect(text).toContain('Sénégal');
    expect(text).toContain('342');
    expect(text).toContain('3');
  });

  it('should expose repository and demo links', () => {
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );
    const repo = links.find((link) => link.getAttribute('href') === PROJECT.repoUrl);
    const demo = links.find((link) => link.getAttribute('href') === PROJECT.demoUrl);

    expect(repo?.textContent).toContain('Voir le dépôt GitHub');
    expect(demo?.textContent).toContain('Ouvrir la démo');
  });

  it('should link the author to their public profile', () => {
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );
    const author = links.find(
      (link) => link.getAttribute('href') === `/u/${PROJECT.user.username}`,
    );

    expect(author?.textContent).toContain('Idrissa Wade');
  });

  it('should set the page and Open Graph metadata', () => {
    const title = TestBed.inject(Title);
    const meta = TestBed.inject(Meta);

    expect(title.getTitle()).toBe(PROJECT.ogMeta.ogTitle);
    expect(meta.getTag('property="og:title"')?.content).toBe(PROJECT.ogMeta.ogTitle);
    expect(meta.getTag('property="og:image"')?.content).toBe(PROJECT.ogMeta.ogImage);
  });

  it('should show an edit link only to the project author', () => {
    authStub.currentUser.mockReturnValue({ id: 'user-1' });

    const ownerFixture = TestBed.createComponent(ProjectDetailComponent);
    ownerFixture.detectChanges();

    const editLink = (ownerFixture.nativeElement as HTMLElement).querySelector(
      'a[href="/projects/project-1/edit"]',
    );

    expect(editLink?.textContent).toContain('Modifier le projet');

    ownerFixture.destroy();
  });

  it('should toggle the star and update the community count', fakeAsync(() => {
    authStub.currentUser.mockReturnValue({ id: 'user-2', role: 'USER' });
    authStub.isAuthenticated.mockReturnValue(true);

    const starredFixture = TestBed.createComponent(ProjectDetailComponent);
    starredFixture.detectChanges();

    const button = Array.from(
      starredFixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.includes('Étoiler ce projet'));

    button?.click();
    starredFixture.detectChanges();

    expect(projectsStub.toggleStar).toHaveBeenCalledWith('project-1');
    expect(starredFixture.nativeElement.textContent).toContain('Retirer mon étoile');
    expect(starredFixture.nativeElement.textContent).toContain('4');

    tick(5000);
    starredFixture.destroy();
  }));

  it('should redirect anonymous visitors to the login page when starring', () => {
    const router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);

    const anonymousFixture = TestBed.createComponent(ProjectDetailComponent);
    anonymousFixture.detectChanges();

    const button = Array.from(
      anonymousFixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.includes('Étoiler ce projet'));

    button?.click();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      expect.objectContaining({ queryParams: expect.any(Object) }),
    );

    anonymousFixture.destroy();
  });

  it('should refresh the GitHub stats for the project author', fakeAsync(() => {
    authStub.currentUser.mockReturnValue({ id: 'user-1', role: 'USER' });
    projectsStub.refreshProject.mockReturnValueOnce(
      of({
        ...PROJECT,
        githubStars: 400,
        githubForks: 25,
        githubSyncedAt: new Date().toISOString(),
        githubImport: 'imported' as const,
      }),
    );

    const ownerFixture = TestBed.createComponent(ProjectDetailComponent);
    ownerFixture.detectChanges();

    const button = Array.from(
      ownerFixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.includes('Rafraîchir les stats'));

    button?.click();
    ownerFixture.detectChanges();

    expect(projectsStub.refreshProject).toHaveBeenCalledWith('project-1');
    expect(ownerFixture.nativeElement.textContent).toContain('400');
    expect(ownerFixture.nativeElement.textContent).toContain('25');

    tick(5000);
    ownerFixture.destroy();
  }));

  it('should explain the one-hour refresh cooldown', () => {
    authStub.currentUser.mockReturnValue({ id: 'user-1', role: 'USER' });
    projectsStub.refreshProject.mockReturnValueOnce(
      throwError(() => ({ status: 429 })),
    );

    const ownerFixture = TestBed.createComponent(ProjectDetailComponent);
    ownerFixture.detectChanges();

    const button = Array.from(
      ownerFixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((candidate) => candidate.textContent?.includes('Rafraîchir les stats'));

    button?.click();
    ownerFixture.detectChanges();

    expect(ownerFixture.nativeElement.textContent).toContain('moins d’une heure');

    ownerFixture.destroy();
  });

  it('should delete the project after confirmation', fakeAsync(() => {
    authStub.currentUser.mockReturnValue({ id: 'user-1', role: 'USER' });
    const router = TestBed.inject(Router);
    jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const ownerFixture = TestBed.createComponent(ProjectDetailComponent);
    const owner = ownerFixture.componentInstance;
    ownerFixture.detectChanges();

    owner.openDeleteConfirm();
    ownerFixture.detectChanges();

    expect(ownerFixture.nativeElement.textContent).toContain('Supprimer ce projet ?');

    owner.confirmDelete();
    ownerFixture.detectChanges();

    expect(projectsStub.deleteProject).toHaveBeenCalledWith('project-1');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/projets');

    tick(5000);
    ownerFixture.destroy();
  }));

  it('should show a not-found state for a 404 response', () => {
    projectsStub.getProject.mockReturnValueOnce(throwError(() => ({ status: 404 })));

    const notFoundFixture = TestBed.createComponent(ProjectDetailComponent);
    notFoundFixture.detectChanges();

    expect(notFoundFixture.nativeElement.textContent).toContain('Projet introuvable');

    notFoundFixture.destroy();
  });
});
