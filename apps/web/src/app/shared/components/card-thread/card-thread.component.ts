import { Component, input, output } from '@angular/core';
import { CommentData } from '../comment-item/comment-item';

export interface Thread {
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
  imports: [],
  templateUrl: './card-thread.component.html',
  styleUrl: './card-thread.component.css',
})
export class CardThreadComponent {
  readonly thread = input.required<Thread>();
  readonly opened = output<Thread>();
}
