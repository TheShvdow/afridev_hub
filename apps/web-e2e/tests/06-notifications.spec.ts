import { test, expect } from '../support/fixtures';
import { createAnswer, createQuestion } from '../support/api';
import { uniqueTitle } from '../support/env';

test.describe.serial('Notifications', () => {
  let questionId = '';

  test.beforeAll(async () => {
    questionId = await createQuestion('author', uniqueTitle('Question pour les notifications'));
  });

  test('une réponse reçue pendant que la page est ouverte s\'affiche tout de suite, sans rechargement', async ({ as }) => {
    const page = await as('author');
    await page.goto('/notifications');
    const lignes = page.locator('ul li button');
    await expect(page.getByText(/non lue|aucune notification/).first()).toBeVisible();
    const avant = await lignes.count();

    await createAnswer('helper', questionId, 'Réponse arrivée pendant que la page des notifications est ouverte, en temps réel.');

    // La nouvelle ligne s'ajoute toute seule (WebSocket) : le nombre de lignes augmente sans recharger la page.
    await expect(lignes).toHaveCount(avant + 1, { timeout: 20_000 });
  });

  test('la notification ouvre la question et se marque lue', async ({ as }) => {
    const page = await as('author');
    await page.goto('/notifications');

    const notification = page.getByRole('button', { name: /Nouvelle réponse à votre question/ }).first();
    await expect(notification).toBeVisible();
    await expect(page.getByText(/[1-9]\d* non lue/).first()).toBeVisible();

    await expect(async () => {
      await notification.click();
      await expect(page).toHaveURL(new RegExp(`/forum/${questionId}$`), { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
  });

  test('« Tout marquer comme lu » vide le compteur', async ({ as }) => {
    // Une nouvelle réponse crée une notification non lue.
    await createAnswer('helper', questionId, 'Une autre réponse, pour disposer d\'une notification non lue à marquer comme lue.');

    const page = await as('author');
    await page.goto('/notifications');
    await expect(page.getByText(/[1-9]\d* non lue/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();

    await expect(page.getByText('0 non lue')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tout marquer comme lu' })).toBeDisabled();
  });
});
