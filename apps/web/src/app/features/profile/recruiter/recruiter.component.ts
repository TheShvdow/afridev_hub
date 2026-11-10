import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService } from '../../../core/services/users.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-recruiter',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './recruiter.component.html',
  styleUrl: './recruiter.component.css',
})
export class RecruiterComponent {
  private readonly usersService = inject(UsersService);

  companyName = '';
  loading = false;
  error = '';
  success = false;

  submit(): void {
    if (!this.companyName.trim()) {
      this.error = "Nom de l'entreprise requis";
      return;
    }
    this.loading = true;
    this.error = '';
    this.usersService.becomeRecruiter(this.companyName.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || "Erreur lors de l'activation du profil recruteur";
      },
    });
  }
}
