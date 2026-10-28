import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface CachedBody {
  body: unknown;
  storedAt: number;
}

const STORAGE_PREFIX = 'afridev_cache:';
const MAX_ENTRIES = 120;
const MAX_ENTRY_CHARS = 200_000;

// Cache en mémoire des réponses, doublé dans `sessionStorage` : un rechargement de la page
// affiche tout de suite les dernières données, qui sont ensuite relues. Chaque entrée est
// rangée sous l'identifiant du membre, donc un compte ne voit jamais les données d'un autre.
@Injectable({ providedIn: 'root' })
export class HttpCacheService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly memory = new Map<string, CachedBody>();
  /** Change à chaque vidage : une lecture partie avant ne doit pas réécrire une donnée périmée après. */
  private generation = 0;

  get currentGeneration(): number {
    return this.generation;
  }

  get(key: string): CachedBody | null {
    const hit = this.memory.get(key);
    if (hit) return hit;

    const stored = this.readStorage(key);
    if (stored) this.memory.set(key, stored);
    return stored;
  }

  set(key: string, body: unknown, generation = this.generation): void {
    if (generation !== this.generation) return;
    const entry: CachedBody = { body, storedAt: Date.now() };
    this.memory.delete(key);
    this.memory.set(key, entry);
    while (this.memory.size > MAX_ENTRIES) {
      const oldest = this.memory.keys().next().value as string;
      this.memory.delete(oldest);
      this.removeStorage(oldest);
    }
    this.writeStorage(key, entry);
  }

  clear(): void {
    this.generation++;
    this.memory.clear();
    if (!this.browser) return;
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
      }
      keys.forEach((key) => sessionStorage.removeItem(key));
    } catch {
      // Stockage indisponible (navigation privée, quota) : le cache mémoire suffit.
    }
  }

  private readStorage(key: string): CachedBody | null {
    if (!this.browser) return null;
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CachedBody;
      return typeof parsed?.storedAt === 'number' ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, entry: CachedBody): void {
    if (!this.browser) return;
    try {
      const raw = JSON.stringify(entry);
      if (raw.length <= MAX_ENTRY_CHARS) sessionStorage.setItem(STORAGE_PREFIX + key, raw);
    } catch {
      // Quota plein : l'entrée reste en mémoire seulement.
    }
  }

  private removeStorage(key: string): void {
    if (!this.browser) return;
    try {
      sessionStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Sans effet.
    }
  }
}
