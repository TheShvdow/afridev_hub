import { Component, input, output } from '@angular/core';
import { CommentItem } from '../comment-item/comment-item';
import { Thread } from '../card-thread/card-thread.component';

@Component({
  selector: 'app-thread-modal',
  standalone: true,
  imports: [CommentItem],
  templateUrl: './thread-modal.component.html',
  styleUrl: './thread-modal.component.css',
})
export class ThreadModalComponent {
  readonly thread = input<Thread | null>(null);
  readonly closed = output<void>();
}
