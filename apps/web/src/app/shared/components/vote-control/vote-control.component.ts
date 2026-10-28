import { Component, input, output } from '@angular/core';
import { VoteValue } from '../../../core/services/votes.service';

// Pouces haut / bas avec le score entre les deux. Le pouce du vote donné est plein.
@Component({
  selector: 'app-vote-control',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-1.5">
      @if (canVote()) {
      <button
        type="button"
        [attr.aria-label]="'Voter pour ' + target()"
        [attr.aria-pressed]="userVote() === 'UP'"
        [disabled]="disabled()"
        (click)="voted.emit('UP')"
        [class]="
          'inline-flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
          (userVote() === 'UP'
            ? 'border-[#0F6932] bg-[#F0FDF4] text-[#0F6932]'
            : 'border-[#E2E8F0] text-[#475569] hover:border-[#0F6932] hover:text-[#0F6932]')
        "
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" [attr.fill]="userVote() === 'UP' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
        </svg>
      </button>
      }
      <span class="min-w-[2ch] text-center text-[14px] font-semibold tabular-nums text-[#141219]" aria-live="polite">{{ score() }} <span class="font-normal text-[#64748B]">votes</span></span>
      @if (canVote()) {
      <button
        type="button"
        [attr.aria-label]="'Voter contre ' + target()"
        [attr.aria-pressed]="userVote() === 'DOWN'"
        [disabled]="disabled()"
        (click)="voted.emit('DOWN')"
        [class]="
          'inline-flex size-8 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ' +
          (userVote() === 'DOWN'
            ? 'border-[#FB2C36] bg-[#FB2C36]/10 text-[#FB2C36]'
            : 'border-[#E2E8F0] text-[#475569] hover:border-[#FB2C36] hover:text-[#FB2C36]')
        "
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" [attr.fill]="userVote() === 'DOWN' ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 14V2" />
          <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
        </svg>
      </button>
      }
    </span>
  `,
})
export class VoteControlComponent {
  readonly score = input.required<number>();
  readonly userVote = input<VoteValue | null | undefined>(null);
  /** « cette question » / « cette réponse », pour les libellés accessibles. */
  readonly target = input.required<string>();
  /** Faux pour un visiteur ou l'auteur du contenu : seul le score est affiché. */
  readonly canVote = input(true);
  readonly disabled = input(false);
  readonly voted = output<VoteValue>();
}
