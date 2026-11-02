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
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ForumPostDetail } from '../../../core/services/forum.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';
import { ReportButtonComponent } from '../../../shared/components/report-button/report-button.component';
import { VoteControlComponent } from '../../../shared/components/vote-control/vote-control.component';
import { AnswerThreadBase } from '../../../shared/forum/answer-thread.base';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, ReportButtonComponent, VoteControlComponent],
  templateUrl: './post-detail.component.html',
  styleUrl: './post-detail.component.css',
})
export class PostDetailComponent extends AnswerThreadBase implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  readonly isAuthenticated = computed(() => this.authStore.isAuthenticated());
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
}
