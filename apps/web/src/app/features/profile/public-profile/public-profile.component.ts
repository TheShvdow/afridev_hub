import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PublicUserProfile,
  UsersService,
  UserActivity,
  UserBadge,
} from '../../../core/services/users.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { initialsFrom } from '../../../shared/utils/forum-thread.mapper';

interface ProfileLink {
  label: string;
  href: string;
}

const ROLE_LABELS: Record<string, string> = {
  MEMBER: 'Membre',
  MODERATOR: 'Modérateur',
  ADMIN: 'Administrateur',
};

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-profile.component.html',
  styleUrl: './public-profile.component.css',
})
export class PublicProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(UsersService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly profile = signal<PublicUserProfile | null>(null);
  readonly activity = signal<UserActivity | null>(null);
  readonly badges = signal<UserBadge[]>([]);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private currentUsername: string | null = null;

  readonly name = computed(() => {
    const profile = this.profile();
    if (!profile) return '';
    return profile.displayName?.trim() || profile.username;
  });

  readonly initials = computed(() => initialsFrom(this.name()));

  readonly roleLabel = computed(() => {
    const role = this.profile()?.role ?? '';
    return ROLE_LABELS[role] ?? role;
  });

  readonly memberSince = computed(() => {
    const createdAt = this.profile()?.createdAt;
    if (!createdAt) return '';

    const formatted = new Intl.DateTimeFormat('fr-FR', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(createdAt));

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  });

  readonly links = computed<ProfileLink[]>(() => {
    const profile = this.profile();
    if (!profile) return [];

    const links: ProfileLink[] = [];
    const website = profile.websiteUrl?.trim();

    if (website) {
      links.push({
        label: 'Site web',
        href: /^https?:\/\//i.test(website) ? website : `https://${website}`,
      });
    }

    if (profile.githubUsername) {
      links.push({
        label: 'GitHub',
        href: `https://github.com/${this.handle(profile.githubUsername)}`,
      });
    }

    if (profile.linkedinUsername) {
      links.push({
        label: 'LinkedIn',
        href: `https://www.linkedin.com/in/${this.handle(profile.linkedinUsername)}`,
      });
    }

    if (profile.twitterUsername) {
      links.push({
        label: 'X',
        href: `https://x.com/${this.handle(profile.twitterUsername)}`,
      });
    }

    return links;
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.load(params.get('username')));
  }

  load(username: string | null): void {
    this.currentUsername = username;

    if (!username) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.usersService
      .getPublicProfile(username)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
          this.applyMetadata(profile);
          this.usersService.getUserActivity(username).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (activity) => this.activity.set(activity),
            error: () => {},
          });
          this.usersService.getUserBadges(username).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (badges) => this.badges.set(badges),
            error: () => {},
          });
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);

          if (error.status === 404) {
            this.notFound.set(true);
            this.title.setTitle('Profil introuvable — AfriDev Hub');
            return;
          }

          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  retry(): void {
    this.load(this.currentUsername);
  }

  private handle(value: string): string {
    return encodeURIComponent(value.trim().replace(/^@+/, ''));
  }

  private applyMetadata(profile: PublicUserProfile): void {
    const name = profile.displayName?.trim() || profile.username;
    const og = profile.ogMeta;
    const description =
      og?.ogDescription ||
      profile.bio?.trim() ||
      `Profil de ${name} sur AfriDev Hub`;

    this.title.setTitle(og?.ogTitle ?? `${name} — AfriDev Hub`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'profile' });
    this.meta.updateTag({ property: 'og:title', content: og?.ogTitle ?? `${name} — AfriDev Hub` });
    this.meta.updateTag({ property: 'og:description', content: description });

    if (og?.ogUrl) {
      this.meta.updateTag({ property: 'og:url', content: og.ogUrl });
    }

    if (og?.ogImage) {
      this.meta.updateTag({ property: 'og:image', content: og.ogImage });
    }
  }
}
