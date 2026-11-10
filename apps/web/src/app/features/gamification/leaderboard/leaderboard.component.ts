import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GamificationService, LeaderboardEntry } from '../../../core/services/gamification.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css',
})
export class LeaderboardComponent implements OnInit {
  initials(entry: any): string {
    const n = entry?.displayName || entry?.username || '';
    return (n[0] || '?').toUpperCase();
  }
  private readonly gamification = inject(GamificationService);

  readonly entries = signal<LeaderboardEntry[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.gamification.leaderboard(1, 100).subscribe({
      next: (res) => {
        this.entries.set(res.data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }
}
