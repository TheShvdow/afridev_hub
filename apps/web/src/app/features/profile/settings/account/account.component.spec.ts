import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthStore } from '../../../../core/store/auth.store';
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
  stack: [],
  reputation: USER_ME.reputation,
  isVerified: USER_ME.isVerified,
};

const usersStub = {
  getPublicProfile: jest.fn(() => of(PROFILE)),
  updateProfile: jest.fn(() => of(UPDATED)),
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
