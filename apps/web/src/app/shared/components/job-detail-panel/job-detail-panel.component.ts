import { Component, input, output } from '@angular/core';
import { Job } from '../card-job.component/card-job.component';

@Component({
  selector: 'app-job-detail-panel',
  standalone: true,
  imports: [],
  templateUrl: './job-detail-panel.component.html',
})
export class JobDetailPanelComponent {
  readonly job = input<Job | null>(null);
  readonly closed = output<void>();
}
