import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  PublicUserProfile,
  UsersService,
} from '../../../core/services/users.service';
import { PublicProfileComponent } from './public-profile.component';

const USER: PublicUserProfile = {
  id: 'user-1',
  username: 'idy_dev',
  displayName: 'Idrissa Wade',
  bio: 'Développeur full-stack basé à Dakar.\nJ’aime les APIs bien documentées.',
  avatarUrl: null,
  location: 'Dakar, Sénégal',
  country: 'SN',
  stack: ['TypeScript'],
  level: 'MID',
  websiteUrl: 'idy.dev',
  githubUsername: 'idy-dev',
  linkedinUsername: 'idrissa-wade',
  twitterUsername: '@idy_dev',
  reputation: 42,
  role: 'MEMBER',
  isVerified: true,
  createdAt: '2024-03-15T10:00:00.000Z',
  _count: { posts: 7, answers: 19, projects: 3, receivedBadges: 5 },
  ogMeta: {
    ogTitle: 'Idrissa Wade (@idy_dev) — AfriDev Hub',
    ogDescription: 'Développeur full-stack basé à Dakar.',
    ogImage: 'https://afridevhub.com/avatars/idy_dev.png',
    ogUrl: 'https://afridevhub.com/@idy_dev',
  },
};

const usersStub = {
  getPublicProfile: jest.fn(() => of(USER)),
};

describe('PublicProfileComponent', () => {
  let fixture: ComponentFixture<PublicProfileComponent>;

  async function setup(username = USER.username): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [PublicProfileComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: usersStub },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ username })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicProfileComponent);
    fixture.detectChanges();
  }

  beforeEach(() => {
    usersStub.getPublicProfile.mockReset();
    usersStub.getPublicProfile.mockReturnValue(of(USER));
  });

  it('should load and render the public profile', async () => {
    await setup();

    const text = fixture.nativeElement.textContent as string;

    expect(usersStub.getPublicProfile).toHaveBeenCalledWith(USER.username);
    expect(text).toContain('Idrissa Wade');
    expect(text).toContain('@idy_dev');
    expect(text).toContain(USER.bio!);
    expect(text).toContain('Dakar, Sénégal');
    expect(text).toContain('Membre depuis Mars 2024');
    expect(text).toContain('Compte vérifié');
    expect(text).toContain('Membre');
    expect(text).toContain('42');
  });

  it('should render the activity counters', async () => {
    await setup();

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('7');
    expect(text).toContain('19');
    expect(text).toContain('3');
    expect(text).toContain('5');
  });

  it('should expose website and social links', async () => {
    await setup();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a') as NodeListOf<HTMLAnchorElement>,
    );
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('https://idy.dev');
    expect(hrefs).toContain('https://github.com/idy-dev');
    expect(hrefs).toContain('https://www.linkedin.com/in/idrissa-wade');
    expect(hrefs).toContain('https://x.com/idy_dev');
  });

  it('should set the page and Open Graph metadata', async () => {
    await setup();

    const title = TestBed.inject(Title);
    const meta = TestBed.inject(Meta);

    expect(title.getTitle()).toBe(USER.ogMeta!.ogTitle);
    expect(meta.getTag('property="og:title"')?.content).toBe(USER.ogMeta!.ogTitle);
    expect(meta.getTag('property="og:image"')?.content).toBe(USER.ogMeta!.ogImage);
    expect(meta.getTag('property="og:url"')?.content).toBe(USER.ogMeta!.ogUrl);
  });

  it('should show a not-found state when the profile does not exist', async () => {
    usersStub.getPublicProfile.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    await setup('inconnu');

    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('Profil introuvable');
    expect(TestBed.inject(Title).getTitle()).toBe(
      'Profil introuvable — AfriDev Hub',
    );
  });

  it('should show an error state and allow retrying', async () => {
    usersStub.getPublicProfile.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { error: { message: 'Erreur serveur.' } },
          }),
      ),
    );

    await setup();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Erreur serveur.');

    const retry = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Réessayer'));
    retry?.click();
    fixture.detectChanges();

    expect(usersStub.getPublicProfile).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Idrissa Wade');
  });
});
