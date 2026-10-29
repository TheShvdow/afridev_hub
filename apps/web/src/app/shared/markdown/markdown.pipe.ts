import { Pipe, PipeTransform } from '@angular/core';
import { renderMarkdown } from './markdown';

/** `[innerHTML]="texte | markdown"` : le texte d'une question ou d'une réponse, mis en forme. */
@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return renderMarkdown(value);
  }
}
