import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Projets } from './projets';
import {
  ListProjectsQuery,
  ProjectCategory,
  ProjectListItem,
  ProjectsService,
} from '../../../core/services/projects.service';
import { CountriesService, Country } from '../../../core/services/countries.service';

const PROJECT: ProjectListItem = {
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
};

const CATEGORIES: ProjectCategory[] = [
  { name: 'Fintech', slug: 'fintech', icon: '💳' },
  { name: 'Web App', slug: 'web-app', icon: null },
];

const COUNTRIES: Country[] = [
  { code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' },
];

const projectsStub = {
  listProjects: jest.fn((query: ListProjectsQuery = {}) =>
    of({
      data: query.page === 2 ? [{ ...PROJECT, id: 'project-2', name: 'PayBridge' }] : [PROJECT],
      meta: { total: 2, page: query.page ?? 1, limit: query.limit ?? 12, totalPages: 2 },
    }),
  ),
  listCategories: jest.fn(() => of(CATEGORIES)),
};

const countriesStub = {
  list: jest.fn(() => of(COUNTRIES)),
};

describe('Projets', () => {
  let fixture: ComponentFixture<Projets>;

  beforeEach(async () => {
    projectsStub.listProjects.mockClear();
    projectsStub.listCategories.mockClear();
    countriesStub.list.mockClear();

    await TestBed.configureTestingModule({
      imports: [Projets],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsStub },
        { provide: CountriesService, useValue: countriesStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Projets);
    fixture.detectChanges();
  });

  it('should load and render the projects', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(projectsStub.listProjects).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 12, sort: 'newest' }),
    );
    expect(text).toContain('AfriPay');
    expect(text).toContain('Idrissa Wade');
    expect(text).toContain('Sénégal');
    expect(text).toContain('NestJS');
    expect(text).toContain('342');
  });

  it('should filter by category', () => {
    const categoryButton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Fintech'));

    categoryButton?.click();
    fixture.detectChanges();

    expect(projectsStub.listProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, category: 'fintech' }),
    );
  });

  it('should combine country, stack and sort filters', () => {
    const component = fixture.componentInstance;

    component.selectCountry('SN');
    component.selectSort('stars');
    component.stackDraft.set('nestjs, angular');
    component.addStack();

    expect(projectsStub.listProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({
        page: 1,
        country: 'SN',
        sort: 'stars',
        stack: ['nestjs', 'angular'],
      }),
    );
  });

  it('should append the next page when loading more', () => {
    const component = fixture.componentInstance;

    component.loadMore();
    fixture.detectChanges();

    expect(projectsStub.listProjects).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    );
    expect(component.rawProjects()).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('PayBridge');
  });

  it('should show an empty state when no project matches', () => {
    projectsStub.listProjects.mockReturnValueOnce(
      of({ data: [], meta: { total: 0, page: 1, limit: 12, totalPages: 0 } }),
    );

    const emptyFixture = TestBed.createComponent(Projets);
    emptyFixture.detectChanges();

    expect(emptyFixture.nativeElement.textContent).toContain(
      'Aucun projet ne correspond à ces filtres.',
    );

    emptyFixture.destroy();
  });
});
