import { Component, input, output } from '@angular/core';

export interface Mentor {
  name: string;
  role: string;
  start: string;
  tags: string[];
  availability: string;
  price: string;
  flag: 'sn' | 'gh' | 'mr' | 'cm';
  avatar?: string;
  initials?: string;
  slot: MentorSlot;
}

export type MentorSlot = 'cette-semaine' | 'demain';

@Component({
  selector: 'app-card-mentor',
  standalone: true,
  imports: [],
  templateUrl: './card-mentor.component.html',
})
export class CardMentorComponent {
  readonly mentor = input.required<Mentor>();
  readonly ctaLabel = input('Réserver');
  readonly booked = output<Mentor>();
}
