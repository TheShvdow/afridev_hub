import { Component, inject, signal } from '@angular/core';
import { PagerComponent } from '../../../shared/components/pager/pager.component';
import { AdminService, AdminUser, USER_ROLES, UserRole } from '../../../core/services/admin.service';
import { ModerationService } from '../../../core/services/moderation.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

/** Contrainte de `BanUserDto.reason`. */
export const BAN_REASON_MIN_LENGTH = 3;

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [PagerComponent],
  templateUrl: './admin-users.component.html',
})
export class AdminUsersComponent {
  private readonly admin = inject(AdminService);
  private readonly moderation = inject(ModerationService);
  private readonly toast = inject(ToastService);
  private readonly authStore = inject(AuthStore);

  readonly roles = USER_ROLES;
  readonly users = signal<AdminUser[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly banningId = signal<string | null>(null);
  readonly banError = signal<string | null>(null);

  private search = '';

  constructor() {
    this.load();
  }

  isMe(user: AdminUser): boolean {
    return this.authStore.currentUser()?.id === user.id;
  }

  find(term: string): void {
    this.search = term.trim();
    this.page.set(1);
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  retry(): void {
    this.load();
  }

  changeRole(user: AdminUser, role: string): void {
    if (this.busyId() || role === user.role) return;

    this.busyId.set(user.id);
    this.admin.updateRole(user.id, role as UserRole).subscribe({
      next: () => {
        this.busyId.set(null);
        this.users.update((list) => list.map((item) => (item.id === user.id ? { ...item, role: role as UserRole } : item)));
        this.toast.success(`Rôle de ${user.username} mis à jour.`);
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractApiErrorMessage(error));
        this.load();
      },
    });
  }

  startBan(user: AdminUser): void {
    this.banError.set(null);
    this.banningId.set(this.banningId() === user.id ? null : user.id);
  }

  ban(user: AdminUser, reason: string): void {
    const trimmed = reason.trim();
    if (trimmed.length < BAN_REASON_MIN_LENGTH) {
      this.banError.set(`Le motif doit contenir au moins ${BAN_REASON_MIN_LENGTH} caractères.`);
      return;
    }
    this.moderate(user, this.moderation.banUser(user.id, trimmed), `${user.username} est banni.`);
  }

  unban(user: AdminUser): void {
    this.moderate(user, this.moderation.unbanUser(user.id), `Le ban de ${user.username} est levé.`);
  }

  private moderate(user: AdminUser, request: ReturnType<ModerationService['unbanUser']>, success: string): void {
    if (this.busyId()) return;

    this.busyId.set(user.id);
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.banningId.set(null);
        this.toast.success(success);
      },
      error: (error) => {
        this.busyId.set(null);
        this.toast.error(extractApiErrorMessage(error));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.admin.listUsers(this.page(), this.search || undefined).subscribe({
      next: ({ data, meta }) => {
        this.users.set(data);
        this.total.set(meta.total);
        this.totalPages.set(Math.max(1, meta.totalPages));
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(error));
      },
    });
  }
}
