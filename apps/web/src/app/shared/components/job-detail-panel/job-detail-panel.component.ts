import { Component, HostListener, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../card-job.component/card-job.component';

@Component({
  selector: 'app-job-detail-panel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './job-detail-panel.component.html',
})
export class JobDetailPanelComponent {
  readonly job = input<Job | null>(null);
  readonly closed = output<void>();

  // Échap ferme le panneau, comme un clic sur le fond.
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.job()) this.closed.emit();
  }
}
