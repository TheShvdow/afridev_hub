import { Component, input, output } from '@angular/core';

export interface Job {
  /** Identifiant de l'offre côté API (absent des données de démonstration). */
  id?: string;
  logo: string;
  company: string;
  title: string;
  location: string;
  country: string;
  type: string;
  mode: string;
  experience?: string;
  skills: string[];
  salary: string;
  currency: string;
  posted: string;
  isNew?: boolean;
  description: string;
  missions?: string[];
  profile?: string[];
  benefits?: string[];
}

@Component({
  selector: 'app-card-job',
  standalone: true,
  imports: [],
  templateUrl: './card-job.component.html',
})
export class CardJobComponent {
  readonly job = input.required<Job>();
  readonly ctaLabel = input('Voir les détails');
  readonly selected = output<Job>();
}
