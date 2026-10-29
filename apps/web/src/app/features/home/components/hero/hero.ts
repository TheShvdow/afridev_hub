import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Délai avant que « par les devs » laisse la place à « et pour les devs ». */
export const SWAP_DELAY_MS = 2200;

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [],
  templateUrl: './hero.html',
})
export class Hero implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Faux à l'arrivée sur la page (« par les devs »), vrai ensuite (« et pour les devs »). */
  readonly swapped = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.timer = setTimeout(() => this.swapped.set(true), SWAP_DELAY_MS);
    this.destroyRef.onDestroy(() => this.cancelAutoSwap());
  }

  /** Un clic fait alterner les deux expressions ; il remplace la bascule automatique, qui ne doit pas le contredire. */
  toggle(): void {
    this.cancelAutoSwap();
    this.swapped.update((value) => !value);
  }

  private cancelAutoSwap(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
