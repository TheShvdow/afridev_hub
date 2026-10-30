import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthStore } from '../../../../core/store/auth.store';
import { ToastService } from '../../../../core/services/toast.service';
import { CountriesService } from '../../../../core/services/countries.service';
import {
  EXPERIENCE_LEVELS,
  ExperienceLevel,
  PublicUserProfile,
  UpdateProfileDto,
  UsersService,
} from '../../../../core/services/users.service';
import { extractApiErrorMessage } from '../../../../core/utils/api-error';
import { parseStackList, stackListValidator } from '../../../../core/utils/stack-list';
import {
  BadgeCriterion,
  MIN_BIO_FOR_BADGE,
  verifiedBadgeCriteria,
} from '../../../../core/utils/verified-badge';
import { initialsFrom } from '../../../../shared/utils/forum-thread.mapper';

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Membre',
  MODERATOR: 'Modérateur',
  ADMIN: 'Administrateur',
};

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly countriesService = inject(CountriesService);

  readonly authStore = inject(AuthStore);

  readonly profile = signal<PublicUserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly levels = EXPERIENCE_LEVELS;
  readonly minBio = MIN_BIO_FOR_BADGE;
  readonly countries = toSignal(
    this.countriesService.list().pipe(catchError(() => of([]))),
    { initialValue: [] },
  );

  private loadedUsername: string | null = null;

  readonly form = this.fb.nonNullable.group({
    displayName: ['', [Validators.maxLength(60)]],
    bio: ['', [Validators.maxLength(500)]],
    location: ['', [Validators.maxLength(100)]],
    country: [''],
    level: ['' as ExperienceLevel | ''],
    stack: ['', [stackListValidator]],
    websiteUrl: ['', [Validators.pattern(/^https?:\/\/\S+$/)]],
    githubUsername: ['', [Validators.maxLength(39)]],
    linkedinUsername: ['', [Validators.maxLength(100)]],
    twitterUsername: ['', [Validators.maxLength(50)]],
  });

  constructor() {
    effect(
      () => {
        const me = this.authStore.currentUser();
        if (!me || me.username === this.loadedUsername) return;

        this.loadedUsername = me.username;
        this.loadProfile(me.username);
      },
      { allowSignalWrites: true },
    );
  }

  readonly displayName = (): string => {
    const me = this.authStore.currentUser();
    return (
      this.form.controls.displayName.value.trim() ||
      this.profile()?.displayName?.trim() ||
      me?.displayName?.trim() ||
      me?.username ||
      ''
    );
  };

  readonly initials = (): string => initialsFrom(this.displayName());

  readonly roleLabel = (): string => {
    const role = this.authStore.currentUser()?.role ?? '';
    return ROLE_LABELS[role] ?? role;
  };

  readonly memberSince = (): string => {
    const createdAt = this.profile()?.createdAt ?? this.authStore.currentUser()?.createdAt;
    if (!createdAt) return '';

    const formatted = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(createdAt));

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  readonly bioLength = (): number => this.form.controls.bio.value.length;

  /** Critères du badge « dev vérifié », recalculés d'après ce qui est saisi dans le formulaire. */
  readonly badgeCriteria = (): BadgeCriterion[] => {
    const value = this.form.getRawValue();
    return verifiedBadgeCriteria({
      isVerified: this.authStore.currentUser()?.isVerified ?? false,
      country: value.country || null,
      stack: parseStackList(value.stack),
      bio: value.bio,
      githubUsername: value.githubUsername,
      linkedinUsername: value.linkedinUsername,
      twitterUsername: value.twitterUsername,
      websiteUrl: value.websiteUrl,
    });
  };

  readonly badgeReached = (): boolean => this.badgeCriteria().every((criterion) => criterion.met);

  private loadProfile(username: string): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService
      .getPublicProfile(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.patchForm(profile);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  private patchForm(profile: PublicUserProfile): void {
    this.form.patchValue({
      displayName: profile.displayName ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      country: profile.country ?? '',
      level: profile.level ?? '',
      stack: (profile.stack ?? []).join(', '),
      websiteUrl: profile.websiteUrl ?? '',
      githubUsername: profile.githubUsername ?? '',
      linkedinUsername: profile.linkedinUsername ?? '',
      twitterUsername: profile.twitterUsername ?? '',
    });
    this.form.markAsPristine();
  }

  submit(): void {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload: UpdateProfileDto = {
      displayName: this.optional(value.displayName),
      bio: this.optional(value.bio),
      location: this.optional(value.location),
      country: value.country || null,
      level: value.level || null,
      stack: parseStackList(value.stack),
      websiteUrl: this.optional(value.websiteUrl),
      githubUsername: this.optional(value.githubUsername, true),
      linkedinUsername: this.optional(value.linkedinUsername, true),
      twitterUsername: this.optional(value.twitterUsername, true),
    };

    this.saving.set(true);
    this.errorMessage.set(null);

    this.usersService
      .updateProfile(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.form.markAsPristine();

          this.profile.update((current) =>
            current
              ? {
                  ...current,
                  displayName: updated.displayName,
                  bio: payload.bio ?? null,
                  location: payload.location ?? null,
                  country: payload.country ?? null,
                  level: payload.level ?? null,
                  stack: payload.stack ?? [],
                  websiteUrl: payload.websiteUrl ?? null,
                  githubUsername: payload.githubUsername ?? null,
                  linkedinUsername: payload.linkedinUsername ?? null,
                  twitterUsername: payload.twitterUsername ?? null,
                }
              : current,
          );

          const me = this.authStore.currentUser();
          if (me) {
            this.authStore.setUser({ ...me, displayName: updated.displayName });
          }

          this.toast.success('Votre profil a été mis à jour.');
        },
        error: (error) => {
          this.saving.set(false);
          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  private optional(value: string, stripAt = false): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    return stripAt ? trimmed.replace(/^@+/, '') : trimmed;
  }

  retry(): void {
    if (this.loadedUsername) this.loadProfile(this.loadedUsername);
  }

  resetForm(): void {
    const profile = this.profile();
    if (profile) {
      this.patchForm(profile);
    } else {
      this.form.reset();
    }
    this.errorMessage.set(null);
  }
}
