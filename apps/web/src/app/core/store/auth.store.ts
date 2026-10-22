import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { computed } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from '../services/auth.service';
import type { UserMe } from '@afridev/shared-types';

interface AuthState {
  currentUser:  UserMe | null;
  accessToken:  string | null;
  refreshToken: string | null;
  isLoading:    boolean;
}

const initialState: AuthState = {
  currentUser:  null,
  accessToken:  null,
  refreshToken: null,
  isLoading:    false,
};

const ACCESS_TOKEN_KEY  = 'afridev_at';
const REFRESH_TOKEN_KEY = 'afridev_rt';

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(initialState),

  withComputed((store) => ({
    isAuthenticated: computed(() => !!store.accessToken()),
  })),

  withMethods((store, authService = inject(AuthService), platformId = inject(PLATFORM_ID)) => {
    const readTokens = (): { accessToken: string | null; refreshToken: string | null } => {
      if (!isPlatformBrowser(platformId)) {
        return { accessToken: null, refreshToken: null };
      }
      return {
        accessToken:  localStorage.getItem(ACCESS_TOKEN_KEY),
        refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
      };
    };

    const persistTokens = (accessToken: string, refreshToken: string): void => {
      if (isPlatformBrowser(platformId)) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    };

    const clearTokens = (): void => {
      if (isPlatformBrowser(platformId)) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    };

    // Réinitialise l'état et efface les tokens persistés.
    const reset = (): void => {
      clearTokens();
      patchState(store, initialState);
    };

    return {
      /** Rehydrater depuis localStorage au démarrage (browser only) */
      initializeAuth(): void {
        if (!isPlatformBrowser(platformId)) return;

        const { accessToken, refreshToken } = readTokens();
        if (!accessToken || !refreshToken) return;

        patchState(store, { accessToken, refreshToken });

        // Charger le profil courant
        authService.getMe().subscribe({
          next: (user) => patchState(store, { currentUser: user }),
          error: () => reset(),
        });
      },

      setTokens(accessToken: string, refreshToken: string): void {
        persistTokens(accessToken, refreshToken);
        patchState(store, { accessToken, refreshToken });
      },

      setUser(user: UserMe | null): void {
        patchState(store, { currentUser: user });
      },

      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      logout(): void {
        reset();
      },
    };
  })
);
