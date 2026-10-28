import { Component, input } from '@angular/core';

// Bandeau « Aperçu » des pages de la phase 2 : le contenu affiché est un exemple, les actions ne sont pas disponibles.
@Component({
  selector: 'app-preview-banner',
  standalone: true,
  template: `
    <div role="status" class="border-b border-[#FBBF24]/40 bg-[#FEFCE8]">
      <p class="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3 text-[15px] leading-[24px] text-[#A16207] sm:px-10 lg:px-0">
        <span class="rounded-full bg-[#FBBF24] px-3 py-0.5 text-[13px] font-bold text-[#141219]">Aperçu</span>
        <span>
          {{ feature() }} arrive bientôt. Les profils affichés sont des exemples et les actions ne sont pas encore disponibles.
        </span>
      </p>
    </div>
  `,
})
export class PreviewBannerComponent {
  /** Nom de la fonctionnalité, par exemple « Le mentorat ». */
  readonly feature = input.required<string>();
}
