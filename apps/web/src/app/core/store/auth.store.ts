import { signalStore, withState, withMethods, withComputed } from '@ngrx/signals';
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

  withMethods((store, authService = inject(AuthService), platformId = inject(PLATFORM_ID)) => ({
    /** Rehydrater depuis localStorage au démarrage (browser only) */
    initializeAuth(): void {
      if (!isPlatformBrowser(platformId)) return;

      const at = localStorage.getItem(ACCESS_TOKEN_KEY);
      const rt = localStorage.getItem(REFRESH_TOKEN_KEY);

      if (at && rt) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (store as any).patchState({ accessToken: at, refreshToken: rt });
        // Charger le profil courant
        authService.getMe().subscribe({
          next: (user) => (store as any).patchState({ currentUser: user }),
          error: () => this.logout(),
        });
      }
    },

    setTokens(accessToken: string, refreshToken: string): void {
      if (isPlatformBrowser(platformId)) {
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (store as any).patchState({ accessToken, refreshToken });
    },

    setUser(user: UserMe): void {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (store as any).patchState({ currentUser: user });
    },

    logout(): void {
      if (isPlatformBrowser(platformId)) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (store as any).patchState(initialState);
    },
  }))
);
