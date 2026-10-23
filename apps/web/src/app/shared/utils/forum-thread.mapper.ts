import { ForumPost } from '../../core/services/forum.service';
import { Thread } from '../components/card-thread/card-thread.component';

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';
}

export function relativeTime(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const minutes = Math.floor((now - date.getTime()) / 60_000);

  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;

  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function mapPostToThread(post: ForumPost): Thread {
  const author = post.user.displayName ?? post.user.username;

  return {
    id: post.id,
    initials: initialsFrom(author),
    tags: post.postTags.map((link) => link.tag.name),
    title: post.title,
    meta: `${author} · ${relativeTime(post.createdAt)}`,
    votes: String(post.voteScore),
    replies: String(post._count.answers),
    body: '',
    comments: [],
  };
}
