import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(message: string): void { this.add('success', message); }
  error(message: string): void   { this.add('error',   message); }
  info(message: string): void    { this.add('info',    message); }
  warning(message: string): void { this.add('warning', message); }

  remove(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }

  private add(type: Toast['type'], message: string): void {
    const id = this.generateId();
    this.toasts.update((list) => [...list, { id, type, message }]);
    setTimeout(() => this.remove(id), 5000);
  }

  // L'identifiant n'a besoin d'être unique qu'au sein de ce service : un compteur suffit.
  // Il ne dépend ni de crypto.randomUUID (absent hors HTTPS) ni d'un générateur pseudo-aléatoire.
  private nextId = 0;

  private generateId(): string {
    this.nextId += 1;
    return `toast-${this.nextId}`;
  }
}
