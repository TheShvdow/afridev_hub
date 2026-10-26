import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-job-filters',
  standalone: true,
  imports: [],
  templateUrl: './job-filters.component.html',
})
export class JobFiltersComponent {
  readonly countries = input.required<string[]>();
  readonly workTypes = input.required<string[]>();
  readonly currencies = input.required<string[]>();

  readonly selectedCountry = model.required<string>();
  readonly selectedWorkType = model.required<string>();
  readonly selectedCurrency = model.required<string>();
}
