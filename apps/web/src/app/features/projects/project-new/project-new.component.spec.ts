import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ProjectNewComponent } from './project-new.component';
import { ProjectsService } from '../../../core/services/projects.service';
import { CountriesService } from '../../../core/services/countries.service';
import { AuthStore } from '../../../core/store/auth.store';

const CREATED = {
  id: 'project-1',
  slug: 'afripay',
  name: 'AfriPay',
  description: 'Paiements mobiles unifiés pour les commerçants africains.',
  country: 'SN',
  repoUrl: 'https://github.com/acme/afripay',
  demoUrl: null,
  githubStars: 0,
  githubForks: 0,
  githubLanguage: null,
  githubLastPush: null,
  githubSyncedAt: null,
  createdAt: new Date().toISOString(),
  category: { name: 'Fintech', slug: 'fintech', icon: null },
  user: {
    id: 'user-1',
    username: 'idy_dev',
    displayName: 'Idrissa Wade',
    avatarUrl: null,
    reputation: 15,
  },
  projectTags: [],
  _count: { stars: 0 },
  githubImport: 'imported' as const,
};

const EXISTING = {
  ...CREATED,
  name: 'AfriPay — Paiements mobiles unifiés',
  demoUrl: 'https://afripay.demo.com',
  projectTags: [{ tag: { name: 'NestJS', slug: 'nestjs' } }],
  ogMeta: {
    ogTitle: 'AfriPay — AfriDev Hub',
    ogDescription: 'Paiements mobiles unifiés pour les commerçants africains.',
    ogImage: null,
    ogUrl: 'https://afridevhub.com/projects/afripay',
  },
  starredByViewer: false,
};

const projectsStub = {
  listCategories: jest.fn(() =>
    of([{ name: 'Fintech', slug: 'fintech', icon: '💳' }]),
  ),
  createProject: jest.fn(() => of(CREATED)),
  getProject: jest.fn(() => of(EXISTING)),
  updateProject: jest.fn(() => of({ ...CREATED, name: EXISTING.name })),
};

const countriesStub = {
  list: jest.fn(() =>
    of([{ code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' }]),
  ),
};

const authStub = {
  currentUser: jest.fn(() => null as { id: string } | null),
};

const routeParams = new BehaviorSubject(convertToParamMap({}));

describe('ProjectNewComponent', () => {
  let component: ProjectNewComponent;
  let fixture: ComponentFixture<ProjectNewComponent>;
  let router: Router;

  const fillValidForm = () => {
    component.form.patchValue({
      name: 'AfriPay — Paiements mobiles unifiés',
      description: 'Solution open-source pour intégrer Wave, Orange Money et MTN MoMo aux commerçants.',
      country: 'SN',
      repoUrl: 'https://github.com/acme/afripay',
      demoUrl: 'https://afripay.demo.com',
      tags: ['TypeScript'],
      categorySlug: 'fintech',
    });
  };

  beforeEach(async () => {
    routeParams.next(convertToParamMap({}));
    projectsStub.listCategories.mockClear();
    projectsStub.createProject.mockClear();
    projectsStub.getProject.mockClear();
    projectsStub.updateProject.mockClear();
    countriesStub.list.mockClear();
    authStub.currentUser.mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [ProjectNewComponent],
      providers: [
        provideRouter([]),
        { provide: ProjectsService, useValue: projectsStub },
        { provide: CountriesService, useValue: countriesStub },
        { provide: AuthStore, useValue: authStub },
        { provide: ActivatedRoute, useValue: { paramMap: routeParams.asObservable() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectNewComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    jest.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should load categories and countries', () => {
    expect(projectsStub.listCategories).toHaveBeenCalled();
    expect(countriesStub.list).toHaveBeenCalled();
    expect(component.categories()).toHaveLength(1);
    expect(component.countries()).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Sénégal');
  });

  it('should not submit an invalid form', () => {
    component.submit();

    expect(projectsStub.createProject).not.toHaveBeenCalled();
    expect(component.form.controls.name.touched).toBe(true);
    expect(component.form.controls.description.touched).toBe(true);
    expect(component.form.controls.tags.touched).toBe(true);
  });

  it('should submit the project and navigate to its detail page', fakeAsync(() => {
    fillValidForm();

    component.submit();

    expect(projectsStub.createProject).toHaveBeenCalledWith({
      name: 'AfriPay — Paiements mobiles unifiés',
      description: 'Solution open-source pour intégrer Wave, Orange Money et MTN MoMo aux commerçants.',
      country: 'SN',
      repoUrl: 'https://github.com/acme/afripay',
      demoUrl: 'https://afripay.demo.com',
      tags: ['typescript'],
      categorySlug: 'fintech',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'afripay']);

    tick(5000);
  }));

  it('should explain that the verified developer badge is required', () => {
    projectsStub.createProject.mockReturnValueOnce(
      throwError(() => ({
        status: 403,
        error: {
          error: {
            code: 'PROJECTS_VERIFIED_BADGE_REQUIRED',
            message: 'Badge requis.',
          },
        },
      })),
    );
    fillValidForm();

    component.submit();
    fixture.detectChanges();

    expect(projectsStub.createProject).toHaveBeenCalled();
    expect(component.errorMessage()).toContain('badge « dev vérifié »');
    expect(fixture.nativeElement.textContent).toContain('badge « dev vérifié »');
  });

  it('should prefill the form and update an existing project', fakeAsync(() => {
    routeParams.next(convertToParamMap({ id: 'project-1' }));
    fixture.detectChanges();

    expect(projectsStub.getProject).toHaveBeenCalledWith('project-1');
    expect(component.isEdit()).toBe(true);
    expect(component.form.controls.name.value).toBe('AfriPay — Paiements mobiles unifiés');
    expect(component.form.controls.tags.value).toEqual(['NestJS']);

    fillValidForm();
    component.submit();

    expect(projectsStub.updateProject).toHaveBeenCalledWith('project-1', {
      name: 'AfriPay — Paiements mobiles unifiés',
      description: 'Solution open-source pour intégrer Wave, Orange Money et MTN MoMo aux commerçants.',
      country: 'SN',
      repoUrl: 'https://github.com/acme/afripay',
      demoUrl: 'https://afripay.demo.com',
      tags: ['typescript'],
      categorySlug: 'fintech',
    });
    expect(projectsStub.createProject).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/projects', 'afripay']);

    tick(5000);
  }));

  it('should prevent editing a project submitted by another member', () => {
    authStub.currentUser.mockReturnValue({ id: 'user-2' });
    routeParams.next(convertToParamMap({ id: 'project-1' }));
    fixture.detectChanges();

    expect(component.forbidden()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Modification impossible');
  });
});
