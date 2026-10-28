import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardJobComponent } from '../../../shared/components/card-job.component/card-job.component';
import { JobDetailPanelComponent } from '../../../shared/components/job-detail-panel/job-detail-panel.component';
import { JobFiltersComponent } from '../../../shared/components/job-filters/job-filters.component';
import { PageHeroComponent } from '../../../shared/components/page-hero/page-hero.component';
import { JobsBoardBase } from '../../../shared/jobs/jobs-board.base';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [RouterLink, CardJobComponent, JobDetailPanelComponent, JobFiltersComponent, PageHeroComponent],
  templateUrl: './job-list.component.html',
})
export class JobListComponent extends JobsBoardBase {
  protected readonly pageSize = 12;
}
