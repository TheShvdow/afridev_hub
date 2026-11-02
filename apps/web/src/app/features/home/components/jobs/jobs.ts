import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../section-heading/section-heading';
import { CardJobComponent } from '../../../../shared/components/card-job.component/card-job.component';
import { JobDetailPanelComponent } from '../../../../shared/components/job-detail-panel/job-detail-panel.component';
import { JobFiltersComponent } from '../../../../shared/components/job-filters/job-filters.component';
import { JobsBoardBase } from '../../../../shared/jobs/jobs-board.base';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [SectionHeading, RouterLink, CardJobComponent, JobDetailPanelComponent, JobFiltersComponent],
  templateUrl: './jobs.html',
})
export class Jobs extends JobsBoardBase {
  protected readonly pageSize = 4;
}
