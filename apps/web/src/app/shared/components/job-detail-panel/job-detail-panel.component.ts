<<<<<<< HEAD
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
=======
import { Component, HostListener, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Job } from '../card-job.component/card-job.component';
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b

@Component({
  selector: 'app-job-detail-panel',
  standalone: true,
<<<<<<< HEAD
  imports: [CommonModule, RouterLink],
=======
  imports: [RouterLink],
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
  templateUrl: './job-detail-panel.component.html',
})
export class JobDetailPanelComponent {
  readonly job = input<any | null>(null);
  readonly closed = output<void>();

<<<<<<< HEAD
  get displaySkills(): string[] {
    const j = this.job();
    return j?.stack || j?.skills || [];
  }

  get displaySalary(): string {
    const j = this.job();
    if (!j) return '';
    if (j.salary) return j.salary;
    if (j.salaryMin && j.salaryMax && j.currency) {
      return `${this.formatNumber(j.salaryMin)} – ${this.formatNumber(j.salaryMax)} ${j.currency}`;
    }
    return '';
  }

  private formatNumber(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(n);
=======
  // Échap ferme le panneau, comme un clic sur le fond.
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.job()) this.closed.emit();
>>>>>>> ce75cd1be8af82b11ef23739427de6b7d57a124b
  }
}
