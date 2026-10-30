import { test, expect, openThread } from '../support/fixtures';
import { findQuestionId } from '../support/api';
import { uniqueTitle } from '../support/env';

// Parcours du forum à deux comptes : l'auteur pose, l'aidant répond, l'auteur vote et accepte, un autre signale.
test.describe.serial('Forum', () => {
  const titre = uniqueTitle('Comment configurer le SSR avec Angular');
  const reponse = 'Activez le rendu côté serveur dans angular.json puis ajoutez le point d\'entrée server.ts.';
  let questionId = '';

  const carte = (page: import('@playwright/test').Page) => page.locator('app-card-thread', { hasText: titre });

  test('l\'auteur pose une question avec un tag', async ({ as }) => {
    const page = await as('author');
    await page.goto('/forum/ask');

    await page.locator('#title').fill(titre);
    await page.locator('#body').fill('Je cherche la marche à suivre pour activer le rendu serveur sur un projet Angular 18 existant, sans tout recréer.');
    await page.locator('#tag').fill('angular');
    await page.locator('#tag').press('Enter');
    await page.getByRole('button', { name: 'Publier la question' }).click();

    await expect(page).toHaveURL(/\/forum$/);
    await expect(carte(page)).toBeVisible();
    questionId = await findQuestionId('author', titre);
  });

  test('l\'aidant répond depuis la fenêtre de discussion, et une réponse trop courte est refusée', async ({ as }) => {
    const page = await as('helper');
    await page.goto('/forum');
    await openThread(page, carte(page));

    const champ = page.locator('app-thread-modal input[formControlName="body"]');
    await champ.fill('Trop court');
    await expect(page.locator('app-thread-modal').getByRole('button', { name: 'Répondre' })).toBeDisabled();

    await champ.fill(reponse);
    await page.locator('app-thread-modal').getByRole('button', { name: 'Répondre' }).click();

    await expect(page.locator('app-thread-modal').getByText(reponse)).toBeVisible();
  });

  test('l\'auteur ne peut pas voter sur sa propre question, mais vote sur la réponse', async ({ as }) => {
    const page = await as('author');
    await page.goto('/forum');
    const modale = await openThread(page, carte(page));

    await expect(modale.getByText(reponse)).toBeVisible();
    await expect(modale.getByRole('button', { name: 'Voter pour cette question' })).toHaveCount(0);

    const pour = modale.getByRole('button', { name: 'Voter pour cette réponse' });
    await pour.click();

    // Affichage immédiat : le pouce est plein et le score passe à 1, sans rechargement.
    await expect(pour).toHaveAttribute('aria-pressed', 'true');
    await expect(modale.getByText('1 votes')).toBeVisible();
  });

  test('le vote donné est retrouvé après rechargement, puis un second clic l\'annule', async ({ as }) => {
    const page = await as('author');
    await page.goto(`/forum/${questionId}`);

    const pour = page.getByRole('button', { name: 'Voter pour cette réponse' });
    await expect(pour).toHaveAttribute('aria-pressed', 'true');

    await pour.click();
    await expect(pour).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByText('0 votes').first()).toBeVisible();
  });

  test('l\'auteur accepte la réponse : la question passe en « Résolue »', async ({ as }) => {
    const page = await as('author');
    await page.goto(`/forum/${questionId}`);

    await page.getByRole('button', { name: 'Accepter cette réponse' }).click();

    await expect(page.getByText('Réponse acceptée').first()).toBeVisible();
    await expect(page.getByText('Résolue').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accepter cette réponse' })).toHaveCount(0);
  });

  test('un autre membre vote sur la question et la signale une seule fois', async ({ as }) => {
    const page = await as('candidate');
    await page.goto(`/forum/${questionId}`);

    const pour = page.getByRole('button', { name: 'Voter pour cette question' });
    await pour.click();
    await expect(pour).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Signaler' }).first().click();
    await page.getByRole('dialog', { name: 'Signaler ce contenu' }).getByRole('button', { name: 'Envoyer' }).click();

    await expect(page.getByRole('button', { name: 'Signalé' }).first()).toBeDisabled();
  });

  test('un visiteur lit la question et sa réponse acceptée sans pouvoir agir', async ({ page }) => {
    await page.goto(`/forum/${questionId}`);

    await expect(page.getByText(titre).first()).toBeVisible();
    await expect(page.getByText(reponse)).toBeVisible();
    await expect(page.getByRole('button', { name: /Voter/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Signaler' })).toHaveCount(0);
  });
});
