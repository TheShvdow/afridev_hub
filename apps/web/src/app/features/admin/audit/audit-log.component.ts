import { Component, inject, signal } from '@angular/core';
import { PagerComponent } from '../../../shared/components/pager/pager.component';
import { AdminService, AuditEntry } from '../../../core/services/admin.service';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [PagerComponent],
  templateUrl: './audit-log.component.html',
})
export class AuditLogComponent {
  private readonly admin = inject(AdminService);

  readonly entries = signal<AuditEntry[]>([]);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.load();
  }

  goTo(page: number): void {
    this.page.set(page);
    this.load();
  }

  retry(): void {
    this.load();
  }

  formatDate(iso: string): string {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.admin.auditLog(this.page()).subscribe({
      next: ({ data, meta }) => {
        this.entries.set(data);
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
