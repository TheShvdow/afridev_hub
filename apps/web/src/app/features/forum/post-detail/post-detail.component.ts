import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ForumAuthorSummary,
  ForumPostDetail,
  ForumService,
} from '../../../core/services/forum.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { initialsFrom, relativeTime } from '../../../shared/utils/forum-thread.mapper';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css',
})
export class PostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly forum = inject(ForumService);
  private readonly authStore = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly post = signal<ForumPostDetail | null>(null);
  readonly canEdit = computed(() => {
    const me = this.authStore.currentUser();
    const post = this.post();
    return !!me && !!post && !post.isHidden && me.id === post.userId;
  });
  readonly canDelete = computed(() => {
    const me = this.authStore.currentUser();
    const post = this.post();
    if (!me || !post) return false;

    const isModerator = me.role === 'ADMIN' || me.role === 'MODERATOR';
    return isModerator || me.id === post.userId;
  });
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly confirmingDelete = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  private currentId: string | null = null;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.confirmingDelete() && !this.deleting()) {
      this.confirmingDelete.set(false);
    }
  }

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => this.load(params.get('id')));
  }

  load(id: string | null): void {
    this.currentId = id;

    if (!id) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    this.loading.set(true);
    this.notFound.set(false);
    this.errorMessage.set(null);

    this.forum
      .getPost(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post) => {
          this.post.set(post);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);

          if (error.status === 404) {
            this.notFound.set(true);
            return;
          }

          this.errorMessage.set(extractApiErrorMessage(error));
        },
      });
  }

  retry(): void {
    this.load(this.currentId);
  }

  openDeleteConfirm(): void {
    this.deleteError.set(null);
    this.confirmingDelete.set(true);
  }

  cancelDelete(): void {
    if (this.deleting()) return;
    this.confirmingDelete.set(false);
    this.deleteError.set(null);
  }

  confirmDelete(): void {
    const id = this.post()?.id;
    if (!id || this.deleting()) return;

    this.deleting.set(true);
    this.deleteError.set(null);

    this.forum.deletePost(id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.toast.success('Question supprimée.');
        this.router.navigateByUrl('/forum');
      },
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);

        if (error.status === 404) {
          this.deleteError.set('Cette question a déjà été supprimée.');
          return;
        }

        if (error.status === 403) {
          this.deleteError.set("Vous n'êtes pas autorisé à supprimer cette question.");
          return;
        }

        this.deleteError.set(extractApiErrorMessage(error));
      },
    });
  }

  authorName(author: ForumAuthorSummary): string {
    return author.displayName ?? author.username;
  }

  initials(author: ForumAuthorSummary): string {
    return initialsFrom(this.authorName(author));
  }

  timeAgo(iso: string): string {
    return relativeTime(iso);
  }
}
