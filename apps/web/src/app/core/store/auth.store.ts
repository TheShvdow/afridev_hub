import { signalStore, withState, withMethods, withComputed, patchState } from '@ngrx/signals';
import { PLATFORM_ID, computed, inject } from '@angular/core';
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
        accessToken:  localStorage.getItem(ACCESS_TOKEN_KEY) ?? sessionStorage.getItem(ACCESS_TOKEN_KEY),
        refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) ?? sessionStorage.getItem(REFRESH_TOKEN_KEY),
      };
    };

    /**
     * « Rester connecté » : la session est conservée d'un redémarrage à l'autre
     * (localStorage). Sans cette option, les tokens ne survivent qu'à l'onglet
     * courant (sessionStorage).
     */
    const persistTokens = (accessToken: string, refreshToken: string, remember: boolean): void => {
      if (!isPlatformBrowser(platformId)) {
        return;
      }

      const target = remember ? localStorage : sessionStorage;
      const other = remember ? sessionStorage : localStorage;

      target.setItem(ACCESS_TOKEN_KEY, accessToken);
      target.setItem(REFRESH_TOKEN_KEY, refreshToken);
      other.removeItem(ACCESS_TOKEN_KEY);
      other.removeItem(REFRESH_TOKEN_KEY);
    };

    const clearTokens = (): void => {
      if (!isPlatformBrowser(platformId)) {
        return;
      }
      for (const storage of [localStorage, sessionStorage]) {
        storage.removeItem(ACCESS_TOKEN_KEY);
        storage.removeItem(REFRESH_TOKEN_KEY);
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

      setTokens(accessToken: string, refreshToken: string, remember = true): void {
        persistTokens(accessToken, refreshToken, remember);
        patchState(store, { accessToken, refreshToken });
      },

      setUser(user: UserMe | null): void {
        patchState(store, { currentUser: user });
      },

      setLoading(isLoading: boolean): void {
        patchState(store, { isLoading });
      },

      /** Efface la session locale sans-appeler l'API (intercepteur de refresh). */
      logout(): void {
        reset();
      },

      /**
       * Déconnexion : purge la session locale immédiatement puis demande à l'API
       * de révoquer le refresh token. Le jeton est capturé avant la purge,
       * sinon la requête partirait sans en-tête `Authorization`.
       */
      signOut(): void {
        const accessToken = store.accessToken();

        reset();

        if (accessToken) {
          authService.logout(accessToken).subscribe({ error: () => undefined });
        }
      },
    };
  })
);
