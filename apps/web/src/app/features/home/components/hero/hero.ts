import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

/** Délai avant que « par les devs » laisse la place à « et pour les devs ». */
export const SWAP_DELAY_MS = 2200;

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './hero.html',
})
export class Hero implements OnInit, AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onVisibilityChange: (() => void) | null = null;

  @ViewChild('heroVideo') private heroVideo?: ElementRef<HTMLVideoElement>;

  /** Faux à l'arrivée sur la page (« par les devs »), vrai ensuite (« et pour les devs »). */
  readonly swapped = signal(false);
  /**
   * Vidéo de fond active. Désactivée si mouvement réduit, économie de données,
   * réseau très lent, échec d'autoplay (iOS/PWA) ou erreur de chargement.
   * L'image poster reste toujours affichée en dessous.
   */
  readonly useVideo = signal(false);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.useVideo.set(this.shouldAttemptVideo());
    this.timer = setTimeout(() => this.swapped.set(true), SWAP_DELAY_MS);
    this.destroyRef.onDestroy(() => {
      this.cancelAutoSwap();
      this.detachVisibilityListener();
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || !this.useVideo()) return;
    void this.startBackgroundVideo();
  }

  /** Un clic fait alterner les deux expressions ; il remplace la bascule automatique, qui ne doit pas le contredire. */
  toggle(): void {
    this.cancelAutoSwap();
    this.swapped.update((value) => !value);
  }

  /** Si la vidéo ne charge pas (hors-ligne PWA, SW, réseau), on garde l'image. */
  onVideoError(): void {
    this.fallbackToPoster();
  }

  private shouldAttemptVideo(): boolean {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;

    const connection = (navigator as Navigator & { connection?: NetworkInformationLike }).connection;
    if (connection?.saveData) return false;
    if (connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') return false;

    return true;
  }

  private async startBackgroundVideo(): Promise<void> {
    const video = this.heroVideo?.nativeElement;
    if (!video) return;

    // Attributs exigés par iOS Safari / PWA standalone pour l'autoplay muet.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.disablePictureInPicture = true;

    try {
      await video.play();
      this.attachVisibilityListener(video);
    } catch {
      this.fallbackToPoster();
    }
  }

  private attachVisibilityListener(video: HTMLVideoElement): void {
    this.onVisibilityChange = () => {
      if (document.hidden) {
        video.pause();
        return;
      }
      void video.play().catch(() => this.fallbackToPoster());
    };
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  private detachVisibilityListener(): void {
    if (!this.onVisibilityChange) return;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.onVisibilityChange = null;
  }

  private fallbackToPoster(): void {
    this.detachVisibilityListener();
    const video = this.heroVideo?.nativeElement;
    video?.pause();
    this.useVideo.set(false);
  }

  private cancelAutoSwap(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
}
