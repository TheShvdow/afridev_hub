import { Component, input, output } from '@angular/core';

// Précédent / suivant pour les listes paginées de l'administration.
@Component({
  selector: 'app-pager',
  standalone: true,
  template: `
    @if (totalPages() > 1) {
      <nav class="mt-6 flex items-center justify-center gap-3" aria-label="Pagination">
        <button
          type="button"
          (click)="pageChange.emit(page() - 1)"
          [disabled]="page() <= 1"
          class="rounded-full border border-[#E2E8F0] px-4 py-2 text-[14px] font-semibold text-[#141219] disabled:opacity-50"
        >
          Précédent
        </button>
        <span class="text-[14px] text-[#64748B]">Page {{ page() }} sur {{ totalPages() }}</span>
        <button
          type="button"
          (click)="pageChange.emit(page() + 1)"
          [disabled]="page() >= totalPages()"
          class="rounded-full border border-[#E2E8F0] px-4 py-2 text-[14px] font-semibold text-[#141219] disabled:opacity-50"
        >
          Suivant
        </button>
      </nav>
    }
  `,
})
export class PagerComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();
}
