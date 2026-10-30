import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-job-detail-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './job-detail-panel.component.html',
  styleUrl: './job-detail-panel.component.css',
})
export class JobDetailPanelComponent {
  readonly job = input<any | null>(null);
  readonly closed = output<void>();

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
  }
}
