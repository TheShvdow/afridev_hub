import { Component, input, signal } from '@angular/core';

export interface CommentData {
  id: string;
  initials: string;
  author: string;
  role: string;
  verified: boolean;
  time: string;
  message: string;
  replies?: CommentData[];
}

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [],
  templateUrl: './comment-item.html',
})
export class CommentItem {
  readonly comment = input.required<CommentData>();

  readonly addedReplies = signal<CommentData[]>([]);
  readonly isReplying = signal(false);
  readonly isExpanded = signal(false);
  readonly replyText = signal('');

  replies(): CommentData[] {
    return [...(this.comment().replies ?? []), ...this.addedReplies()];
  }

  toggleReplies(): void {
    this.isExpanded.update((expanded) => !expanded);
  }

  startReply(): void {
    this.isReplying.set(true);
  }

  cancelReply(): void {
    this.isReplying.set(false);
    this.replyText.set('');
  }

  submitReply(): void {
    const text = this.replyText().trim();
    if (!text) {
      return;
    }

    this.addedReplies.update((replies) => [
      ...replies,
      {
        id: `user-${Date.now()}`,
        initials: 'MO',
        author: 'Moi',
        role: 'Membre',
        verified: false,
        time: "à l'instant",
        message: text,
      },
    ]);

    this.replyText.set('');
    this.isReplying.set(false);
    this.isExpanded.set(true);
  }
}
