import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthStore } from './core/store/auth.store';
import { Navbar } from './layout/navbar/navbar';
import { Footer } from './layout/footer/footer';
import { AppToastContainer } from './layout/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, Navbar, Footer, AppToastContainer],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private readonly authStore = inject(AuthStore);

  ngOnInit(): void {
    // Rehydrater l'état auth depuis le token stocké (si présent)
    this.authStore.initializeAuth();
  }
}
