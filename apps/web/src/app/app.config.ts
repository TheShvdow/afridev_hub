import { ApplicationConfig, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';

import { appRoutes } from './app.routes';
import { envelopeInterceptor } from './core/interceptors/envelope.interceptor';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),

    // Router avec transitions de vue et binding d'inputs
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      })
    ),

    // HTTP client avec intercepteurs.
    // L'ordre compte : `envelopeInterceptor` est le plus externe, il dépouille
    // l'enveloppe `{ data }` avant que la réponse n'atteigne les composants.
    // `cacheInterceptor` vient juste après : il garde la réponse brute de l'API.
    provideHttpClient(
      withFetch(),
      withInterceptors([envelopeInterceptor, cacheInterceptor, authInterceptor, errorInterceptor])
    ),

    // Hydratation SSR
    provideClientHydration(withEventReplay()),

    // Service Worker (PWA)
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
