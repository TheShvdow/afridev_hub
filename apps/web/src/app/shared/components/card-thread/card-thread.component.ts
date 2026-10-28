import { Component, input, output } from '@angular/core';
import { CommentData } from '../comment-item/comment-item';
import { PrefetchDirective } from '../../directives/prefetch.directive';

export interface Thread {
  id: string;
  initials: string;
  tags: string[];
  title: string;
  meta: string;
  votes: string;
  replies: string;
  body: string;
  comments: CommentData[];
}

@Component({
  selector: 'app-card-thread',
  standalone: true,
  imports: [PrefetchDirective],
  templateUrl: './card-thread.component.html',
})
export class CardThreadComponent {
  readonly thread = input.required<Thread>();
  readonly opened = output<Thread>();
}
