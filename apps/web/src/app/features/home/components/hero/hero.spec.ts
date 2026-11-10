import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Hero, SWAP_DELAY_MS } from './hero';

describe('Hero — titre qui change', () => {
  let fixture: ComponentFixture<Hero>;
  let playMock: jest.Mock;

  const bouton = () => (fixture.nativeElement as HTMLElement).querySelector('h1 button') as HTMLButtonElement;
  const phrases = () => {
    const spans = Array.from(bouton().querySelectorAll('span')) as HTMLElement[];
    return {
      par: spans.find((span) => span.textContent?.trim() === 'par les devs')!,
      pour: spans.find((span) => span.textContent?.trim() === 'et pour les devs')!,
    };
  };
  const visible = (span: HTMLElement) => span.className.includes('opacity-100');

  const mockMatchMedia = (matchesReducedMotion = false) => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: matchesReducedMotion && query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    mockMatchMedia(false);
    playMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      writable: true,
      value: playMock,
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
    await TestBed.configureTestingModule({ imports: [Hero], providers: [provideRouter([])] }).compileComponents();
    fixture = TestBed.createComponent(Hero);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('affiche « par les devs » en vert à l\'arrivée, « et pour les devs » étant masqué', () => {
    const { par, pour } = phrases();

    expect(visible(par)).toBe(true);
    expect(visible(pour)).toBe(false);
    expect(bouton().className).toContain('text-[#26a15b]');
  });

  it('bascule seul vers « et pour les devs » après le délai, pas avant', () => {
    jest.advanceTimersByTime(SWAP_DELAY_MS - 100);
    fixture.detectChanges();
    expect(visible(phrases().par)).toBe(true);

    jest.advanceTimersByTime(200);
    fixture.detectChanges();
    expect(visible(phrases().par)).toBe(false);
    expect(visible(phrases().pour)).toBe(true);
  });

  it('change d\'expression à chaque clic, dans les deux sens', () => {
    jest.advanceTimersByTime(SWAP_DELAY_MS + 100);
    fixture.detectChanges();
    expect(visible(phrases().pour)).toBe(true);

    bouton().click();
    fixture.detectChanges();
    expect(visible(phrases().par)).toBe(true);
    expect(visible(phrases().pour)).toBe(false);

    bouton().click();
    fixture.detectChanges();
    expect(visible(phrases().pour)).toBe(true);

    bouton().click();
    fixture.detectChanges();
    expect(visible(phrases().par)).toBe(true);
  });

  it('un clic avant la bascule automatique la remplace au lieu de la subir', () => {
    bouton().click();
    fixture.detectChanges();
    expect(visible(phrases().pour)).toBe(true);

    jest.advanceTimersByTime(SWAP_DELAY_MS * 2);
    fixture.detectChanges();
    expect(visible(phrases().pour)).toBe(true);
    expect(fixture.componentInstance.swapped()).toBe(true);
  });

  it('un second clic ne laisse pas la bascule automatique revenir plus tard', () => {
    bouton().click();
    bouton().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.swapped()).toBe(false);

    jest.advanceTimersByTime(SWAP_DELAY_MS * 2);
    fixture.detectChanges();
    expect(fixture.componentInstance.swapped()).toBe(false);
    expect(visible(phrases().par)).toBe(true);
  });

  it('est un vrai bouton, utilisable au clavier, et ne cache aux lecteurs d\'écran que l\'expression inactive', () => {
    expect(bouton().tagName).toBe('BUTTON');
    expect(bouton().type).toBe('button');
    expect(bouton().title).toBe('Cliquer pour changer');
    expect(phrases().par.getAttribute('aria-hidden')).toBe('false');
    expect(phrases().pour.getAttribute('aria-hidden')).toBe('true');

    bouton().click();
    fixture.detectChanges();
    expect(phrases().par.getAttribute('aria-hidden')).toBe('true');
    expect(phrases().pour.getAttribute('aria-hidden')).toBe('false');
  });

  it('respecte les préférences de mouvement réduit', () => {
    expect(phrases().par.className).toContain('motion-reduce:transition-none');
  });

  it('arrête son minuteur quand le composant est détruit', () => {
    const component = fixture.componentInstance;
    fixture.destroy();

    jest.advanceTimersByTime(SWAP_DELAY_MS * 2);
    expect(component.swapped()).toBe(false);
  });

  it('mène les deux boutons vers le forum et les projets, sans lien mort', () => {
    const liens = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('section a')) as HTMLAnchorElement[];
    const cible = (texte: string) => liens.find((lien) => lien.textContent?.includes(texte))?.getAttribute('href');

    expect(cible('Explorer la plateforme')).toBe('/forum');
    expect(cible('Voir les projets')).toBe('/projets');
    expect(liens.every((lien) => lien.getAttribute('href') !== '#')).toBe(true);
  });

  it('adapte la taille du titre à la largeur de l\'écran sur mobile pour garder l\'expression sur une ligne', () => {
    const h1 = (fixture.nativeElement as HTMLElement).querySelector('h1')!;

    expect(h1.className).toContain('text-[min(48px,calc((100vw-40px)/8))]');
    expect(bouton().className).toContain('whitespace-nowrap');
  });

  it('couvre le viewport mobile (svh) et garde un poster toujours visible', () => {
    const section = (fixture.nativeElement as HTMLElement).querySelector('section')!;
    const poster = (fixture.nativeElement as HTMLElement).querySelector('img[src="assets/images/hero_img.png"]');

    expect(section.className).toContain('min-h-[100svh]');
    expect(poster).toBeTruthy();
  });

  it('joue la vidéo hero en boucle en arrière-plan (muette, autoplay, playsinline)', async () => {
    await Promise.resolve();
    fixture.detectChanges();

    const video = (fixture.nativeElement as HTMLElement).querySelector('video') as HTMLVideoElement;
    const source = video.querySelector('source');

    expect(fixture.componentInstance.useVideo()).toBe(true);
    expect(video).toBeTruthy();
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.hasAttribute('webkit-playsinline')).toBe(true);
    expect(video.getAttribute('poster')).toBe('assets/images/hero_img.png');
    expect(source?.getAttribute('src')).toBe('assets/images/hero.mp4');
    expect(playMock).toHaveBeenCalled();
  });

  it('repasse sur le poster si la vidéo échoue (mobile / PWA / hors-ligne)', () => {
    expect(fixture.componentInstance.useVideo()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).querySelector('video')).toBeTruthy();

    fixture.componentInstance.onVideoError();
    fixture.detectChanges();

    expect(fixture.componentInstance.useVideo()).toBe(false);
    expect((fixture.nativeElement as HTMLElement).querySelector('video')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('img[src="assets/images/hero_img.png"]')).toBeTruthy();
  });

  it('désactive la vidéo si prefers-reduced-motion', () => {
    mockMatchMedia(true);

    const local = TestBed.createComponent(Hero);
    local.detectChanges();

    expect(local.componentInstance.useVideo()).toBe(false);
    expect(local.nativeElement.querySelector('video')).toBeNull();
  });
});
