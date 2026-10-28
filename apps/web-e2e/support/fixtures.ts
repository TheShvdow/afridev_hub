import { Browser, BrowserContext, Locator, Page, expect, test as base } from '@playwright/test';
import { UserKey } from './env';
import { tokensOf } from './api';

/** Clés de stockage du jeton, celles de `AuthStore`. */
const ACCESS_KEY = 'afridev_at';
const REFRESH_KEY = 'afridev_rt';

export interface Session {
  context: BrowserContext;
  page: Page;
}

/** Ouvre un navigateur déjà connecté en tant que `key` (jetons posés avant le chargement de l'application). */
export async function openAs(browser: Browser, key: UserKey): Promise<Session> {
  const { accessToken, refreshToken } = tokensOf(key);
  const context = await browser.newContext();
  await context.addInitScript(
    ([access, refresh, accessKey, refreshKey]) => {
      localStorage.setItem(accessKey, access);
      localStorage.setItem(refreshKey, refresh);
    },
    [accessToken, refreshToken, ACCESS_KEY, REFRESH_KEY],
  );
  return { context, page: await context.newPage() };
}

/** Fenêtre d'un autre compte pour les scénarios à deux personnes (question posée par l'un, réponse de l'autre). */
export const test = base.extend<{ as: (key: UserKey) => Promise<Page> }>({
  as: async ({ browser }, use) => {
    const opened: Session[] = [];
    await use(async (key) => {
      const session = await openAs(browser, key);
      opened.push(session);
      return session.page;
    });
    await Promise.all(opened.map((session) => session.context.close()));
  },
});

/**
 * Ouvre la fenêtre de discussion d'une carte du forum. Juste après le chargement, la page est déjà affichée
 * mais pas encore « branchée » (le serveur de développement envoie du HTML rendu) : un clic trop tôt est perdu.
 * On recommence donc le clic jusqu'à ce que la fenêtre soit ouverte.
 */
export async function openThread(page: Page, card: Locator): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name: 'Discussion' });
  await expect(async () => {
    await card.click();
    await expect(dialog).toBeVisible({ timeout: 2_000 });
    // Une fenêtre fermée reste dans la page avec une opacité nulle : on attend qu'elle soit réellement affichée.
    await expect(page.locator('app-thread-modal > div')).not.toHaveClass(/opacity-0/, { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  return page.locator('app-thread-modal');
}

export { expect };
