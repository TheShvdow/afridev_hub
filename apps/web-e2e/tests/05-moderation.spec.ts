import { test, expect } from '../support/fixtures';
import { createAnswer, createQuestion } from '../support/api';
import { uniqueTitle } from '../support/env';

// Signalement d'un contenu par un membre, traitement par la modération, effet sur le contenu.
test.describe.serial('Modération', () => {
  const titre = uniqueTitle('Question à modérer');
  let questionId = '';

  test.beforeAll(async () => {
    questionId = await createQuestion('author', titre);
    await createAnswer('helper', questionId, 'Une réponse suffisamment longue pour passer la validation du forum.');
  });

  test('un membre signale la question, puis le bouton est verrouillé', async ({ as }) => {
    const page = await as('candidate');
    await page.goto(`/forum/${questionId}`);

    await page.getByRole('button', { name: 'Signaler' }).first().click();
    const formulaire = page.getByRole('dialog', { name: 'Signaler ce contenu' });
    await formulaire.getByLabel('Précisions (facultatif)').fill('Question de test de la suite e2e.');
    await formulaire.getByRole('button', { name: 'Envoyer' }).click();

    await expect(page.getByText('votre signalement a été transmis')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Signalé' }).first()).toBeDisabled();
  });

  test('l\'auteur ne peut pas signaler son propre contenu', async ({ as }) => {
    const page = await as('author');
    await page.goto(`/forum/${questionId}`);

    await expect(page.getByRole('heading', { name: titre })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Signaler' })).toHaveCount(1); // seulement la réponse de l'aidant
  });

  test('la modération voit le signalement et masque le contenu', async ({ as }) => {
    const page = await as('mod');
    await page.goto('/admin/reports');

    const signalement = page.locator('li', { has: page.locator(`a[href="/forum/${questionId}"]`) });
    await expect(signalement).toBeVisible();
    await expect(signalement.getByText('Spam ou publicité')).toBeVisible();
    await expect(signalement.getByText('Question de test de la suite e2e.')).toBeVisible();

    await signalement.getByRole('button', { name: 'Appliquer' }).click();

    await expect(page.getByText('Signalement traité.')).toBeVisible();
    await expect(page.locator('li', { has: page.locator(`a[href="/forum/${questionId}"]`) })).toHaveCount(0);
  });

  test('le signalement traité apparaît dans l\'onglet « Résolus »', async ({ as }) => {
    const page = await as('mod');
    await page.goto('/admin/reports');

    await page.getByLabel('Statut').selectOption('RESOLVED');

    const signalement = page.locator('li', { has: page.locator(`a[href="/forum/${questionId}"]`) });
    await expect(signalement).toBeVisible();
    await expect(signalement.getByRole('button', { name: 'Appliquer' })).toHaveCount(0);
  });

  test('le contenu masqué est remplacé par un texte neutre pour un visiteur', async ({ page }) => {
    await page.goto(`/forum/${questionId}`);

    await expect(page.getByText('[Contenu masqué]').first()).toBeVisible();
    await expect(page.getByText(titre)).toHaveCount(0);
  });

  test('un modérateur voit « Signalements » et « Offres à valider » mais pas la partie réservée aux administrateurs', async ({ as }) => {
    const page = await as('mod');
    await page.goto('/admin');

    const nav = page.getByRole('navigation', { name: "Sections de l'administration" });
    await expect(nav.getByRole('link', { name: 'Signalements' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Offres à valider' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Utilisateurs' })).toHaveCount(0);

    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/forum/);
  });

  test('un membre simple n\'accède pas à l\'administration', async ({ as }) => {
    const page = await as('candidate');
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/forum/);
  });
});
