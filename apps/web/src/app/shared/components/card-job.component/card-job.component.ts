import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Job {
<<<<<<< HEAD
  logo?: string;
=======
  /** Identifiant de l'offre côté API (absent des données de démonstration). */
  id?: string;
  logo: string;
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
  company: string;
  title: string;
  location?: string;
  country?: string;
  type: string;
<<<<<<< HEAD
  mode?: string;
  experience?: string;
  skills?: string[];
  stack?: string[];
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  posted?: string;
  publishedAt?: any;
  isNew?: boolean;
  description?: string;
=======
  mode: string;
  experience?: string;
  skills: string[];
  salary: string;
  currency: string;
  posted: string;
  isNew?: boolean;
  description: string;
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
  missions?: string[];
  profile?: string[];
  benefits?: string[];
}

@Component({
  selector: 'app-card-job',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card-job.component.html',
})
export class CardJobComponent {
  readonly job = input.required<Job>();
  readonly ctaLabel = input('Voir les détails');
  readonly selected = output<Job>();

  get displaySkills(): string[] {
    const j = this.job() as any;
    return j.skills || j.stack || [];
  }

  get displayLocation(): string {
    const j = this.job() as any;
    return j.location || j.country || '';
  }

  get displaySalary(): string {
    const j = this.job() as any;
    if (j.salary) return j.salary;
    if (j.salaryMin && j.salaryMax && j.currency) {
      return `${this.formatNumber(j.salaryMin)} – ${this.formatNumber(j.salaryMax)} ${j.currency}`;
    }
    if (j.salaryMin && j.currency) {
      return `${this.formatNumber(j.salaryMin)} ${j.currency}`;
    }
    return '';
  }

  get displayPosted(): string {
    const j = this.job() as any;
    if (j.posted) return j.posted;
    if (j.publishedAt) {
      return 'Publié récemment';
    }
    return '';
  }

  get displayLogo(): string {
    const j = this.job() as any;
    return j.logo || 'assets/images/default-company.png';
  }

  private formatNumber(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
  }
}
