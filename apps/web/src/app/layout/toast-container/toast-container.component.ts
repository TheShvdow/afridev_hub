import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';
import { ToastComponent } from '@afridev/ui';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  template: `
    @for (toast of toastService.toasts(); track toast.id) {
      <afri-toast [toast]="toast" (dismissed)="toastService.remove($event)" />
    }
  `,
  styles: [`
    :host {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    }
    :host ::ng-deep afri-toast {
      pointer-events: auto;
    }
  `],
})
export class AppToastContainer {
  readonly toastService = inject(ToastService);
}
