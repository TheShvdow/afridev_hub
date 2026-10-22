import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { extractApiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.form.getRawValue()).subscribe({
      next: (tokens) => {
        this.authStore.setTokens(tokens.accessToken, tokens.refreshToken);

        this.authService.getMe().subscribe({
          next: (user) => {
            this.authStore.setUser(user);
            this.router.navigateByUrl('/forum');
          },
          error: () => {
            this.authStore.setUser(null);
            this.router.navigateByUrl('/forum');
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(extractApiErrorMessage(err));
      },
    });
  }
}