import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../../core/store/auth.store';
import { CountriesService } from '../../../../core/services/countries.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
  MyProfile,
  PublicUserProfile,
  UsersService,
} from '../../../../core/services/users.service';
import { AccountComponent } from './account.component';

const USER_ME = {
  id: 'user-1',
  email: 'idrissa@example.com',
  username: 'idy_dev',
  displayName: 'Idrissa Wade',
  avatarUrl: null,
  role: 'MEMBER' as const,
  isVerified: true,
  reputation: 42,
  emailNotifications: true,
  isRecruiter: false,
  companyName: null,
  preferredCurrency: null,
  createdAt: '2024-03-15T10:00:00.000Z',
};

const PROFILE: PublicUserProfile = {
  id: USER_ME.id,
  username: USER_ME.username,
  displayName: USER_ME.displayName,
  bio: 'Développeur full-stack basé à Dakar.',
  avatarUrl: null,
  location: 'Dakar, Sénégal',
  country: 'SN',
  stack: ['TypeScript', 'NestJS'],
  level: 'MID',
  websiteUrl: 'https://idy.dev',
  githubUsername: 'idy-dev',
  linkedinUsername: 'idrissa-wade',
  twitterUsername: 'idy_dev',
  reputation: USER_ME.reputation,
  role: USER_ME.role,
  isVerified: USER_ME.isVerified,
  createdAt: USER_ME.createdAt,
  _count: { posts: 7, answers: 19, projects: 3, receivedBadges: 5 },
};

const UPDATED: MyProfile = {
  id: USER_ME.id,
  username: USER_ME.username,
  displayName: 'Idrissa W.',
  bio: PROFILE.bio,
  country: 'SN',
  level: 'MID',
  stack: ['TypeScript', 'NestJS'],
  reputation: USER_ME.reputation,
  isVerified: USER_ME.isVerified,
};

const usersStub = {
  getPublicProfile: jest.fn(() => of(PROFILE)),
  updateProfile: jest.fn(() => of(UPDATED)),
};

const countriesStub = {
  list: jest.fn(() =>
    of([
      { code: 'SN', alpha3: 'SEN', name: 'Sénégal', region: 'AFRICA' as const },
      { code: 'CI', alpha3: 'CIV', name: "Côte d'Ivoire", region: 'AFRICA' as const },
    ]),
  ),
};

const authStub = {
  currentUser: jest.fn(() => USER_ME as typeof USER_ME | null),
  isAuthenticated: jest.fn(() => true),
  setUser: jest.fn(),
};

const toastStub = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
};

describe('AccountComponent', () => {
  let fixture: ComponentFixture<AccountComponent>;
  let component: AccountComponent;

  beforeEach(async () => {
    usersStub.getPublicProfile.mockReset();
    usersStub.getPublicProfile.mockReturnValue(of(PROFILE));
    usersStub.updateProfile.mockReset();
    usersStub.updateProfile.mockReturnValue(of(UPDATED));
    authStub.currentUser.mockReset();
    authStub.currentUser.mockReturnValue(USER_ME);
    authStub.setUser.mockReset();
    authStub.isAuthenticated.mockReturnValue(true);
    toastStub.success.mockReset();

    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideRouter([]),
        { provide: UsersService, useValue: usersStub },
        { provide: CountriesService, useValue: countriesStub },
        { provide: AuthStore, useValue: authStub },
        { provide: ToastService, useValue: toastStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    fixture.detectChanges();
  });

  it('should load the current user profile and prefill the form', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(usersStub.getPublicProfile).toHaveBeenCalledWith(USER_ME.username);
    expect(text).toContain('Idrissa Wade');
    expect(text).toContain('@idy_dev');
    expect(text).toContain(USER_ME.email);
    expect(
      (fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement).value,
    ).toBe(PROFILE.bio);
    expect(component.form.getRawValue()).toEqual({
      displayName: PROFILE.displayName,
      bio: PROFILE.bio,
      location: PROFILE.location,
      country: 'SN',
      level: 'MID',
      stack: 'TypeScript, NestJS',
      websiteUrl: PROFILE.websiteUrl,
      githubUsername: PROFILE.githubUsername,
      linkedinUsername: PROFILE.linkedinUsername,
      twitterUsername: PROFILE.twitterUsername,
    });
  });

  it('should link to the public profile', () => {
    const link = fixture.nativeElement.querySelector(
      'a[href="/u/idy_dev"]',
    ) as HTMLAnchorElement;

    expect(link?.textContent).toContain('Voir mon profil public');
  });

  it('should save the profile and update the auth store', () => {
    component.form.patchValue({
      displayName: '  Idrissa W.  ',
      websiteUrl: '',
      githubUsername: '@idy-dev',
    });
    component.form.markAsDirty();

    component.submit();

    expect(usersStub.updateProfile).toHaveBeenCalledWith({
      displayName: 'Idrissa W.',
      bio: PROFILE.bio,
      location: PROFILE.location,
      country: 'SN',
      level: 'MID',
      stack: ['TypeScript', 'NestJS'],
      websiteUrl: null,
      githubUsername: 'idy-dev',
      linkedinUsername: PROFILE.linkedinUsername,
      twitterUsername: PROFILE.twitterUsername,
    });
    expect(toastStub.success).toHaveBeenCalledWith('Votre profil a été mis à jour.');
    expect(authStub.setUser).toHaveBeenCalledWith({
      ...USER_ME,
      displayName: 'Idrissa W.',
    });
    expect(component.profile()?.displayName).toBe('Idrissa W.');
    expect(component.form.pristine).toBe(true);
  });

  it('should offer the countries returned by the API and keep the saved one selected', () => {
    const select = fixture.nativeElement.querySelector('select[formcontrolname="country"]') as HTMLSelectElement;
    const labels = Array.from(select.options).map((option) => option.textContent?.trim());

    expect(labels).toEqual(['Non renseigné', 'Sénégal', "Côte d'Ivoire"]);
    expect(select.value).toBe('SN');
  });

  it('should show the five conditions of the verified badge and which ones are met', () => {
    const items = Array.from(
      fixture.nativeElement.querySelectorAll('ul[aria-label="Conditions du badge dev vérifié"] li'),
    ) as HTMLElement[];

    expect(items).toHaveLength(5);
    // La bio de test ne fait que 36 caractères : c'est la seule condition à compléter.
    const toComplete = items.filter((item) => item.textContent?.includes('(à compléter)'));
    expect(toComplete).toHaveLength(1);
    expect(toComplete[0].textContent).toContain('Biographie');
    expect(component.badgeReached()).toBe(false);
  });

  it('should update the badge checklist as the bio grows to 50 characters', () => {
    component.form.controls.bio.setValue('a'.repeat(50));
    fixture.detectChanges();

    expect(component.badgeReached()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('enregistrez pour recevoir le badge');
  });

  it('should send the stack as a list parsed from the comma separated input', () => {
    component.form.patchValue({ stack: ' Angular, docker ,, ANGULAR ', country: '', level: '' });
    component.form.markAsDirty();

    component.submit();

    expect(usersStub.updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ stack: ['Angular', 'docker'], country: null, level: null }),
    );
  });

  it('should not submit a stack of more than ten technologies', () => {
    component.form.controls.stack.setValue('a,b,c,d,e,f,g,h,i,j,k');
    component.form.markAsDirty();

    component.submit();

    expect(usersStub.updateProfile).not.toHaveBeenCalled();
    expect(component.form.controls.stack.errors).toEqual({ stackTooMany: true });
  });

  it('should not submit an invalid form', () => {
    component.form.controls.websiteUrl.setValue('pas-une-url');
    component.form.markAsDirty();

    component.submit();

    expect(usersStub.updateProfile).not.toHaveBeenCalled();
    expect(component.form.controls.websiteUrl.touched).toBe(true);
  });

  it('should display an API error and keep the form editable', () => {
    usersStub.updateProfile.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Données invalides.',
                details: ['URL de site web invalide.'],
              },
            },
          }),
      ),
    );

    component.form.controls.displayName.setValue('Nouveau nom');
    component.form.markAsDirty();
    component.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Données invalides. URL de site web invalide.',
    );
    expect(component.saving()).toBe(false);
  });

  it('should reset unsaved changes', () => {
    component.form.controls.displayName.setValue('Nom temporaire');
    component.form.markAsDirty();

    component.resetForm();

    expect(component.form.controls.displayName.value).toBe(PROFILE.displayName);
    expect(component.form.pristine).toBe(true);
  });
});
