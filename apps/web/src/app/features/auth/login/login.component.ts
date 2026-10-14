import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthStore } from '../../../core/store/auth.store';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb          = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly authStore   = inject(AuthStore);
  private readonly router      = inject(Router);
  private readonly toast       = inject(ToastService);

  isLoading = false;

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) return;

    this.isLoading = true;
    const { email, password } = this.form.value;

    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (tokens) => {
        this.authStore.setTokens(tokens.accessToken, tokens.refreshToken);
        this.authService.getMe().subscribe((user) => {
          this.authStore.setUser(user);
          this.router.navigate(['/forum']);
        });
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Email ou mot de passe incorrect.');
      },
    });
  }

  loginWithGithub(): void {
    this.authService.loginWithGithub();
  }
}
