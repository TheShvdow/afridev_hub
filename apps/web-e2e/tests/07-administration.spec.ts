import { test, expect } from '../support/fixtures';
import { E2E_PASSWORD } from '../support/env';

test.describe.serial('Administration', () => {
  test('l\'administrateur arrive sur le tableau de bord avec les indicateurs de succès', async ({ as }) => {
    const page = await as('admin');
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
    for (const code of ['SM-2', 'SM-3', 'SM-5', 'SM-6', 'SM-7']) {
      await expect(page.getByText(code, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Signalements en attente')).toBeVisible();
    await expect(page.getByText('Offres à valider').last()).toBeVisible();
  });

  test('l\'administrateur bannit puis rétablit un compte', async ({ as }) => {
    const page = await as('admin');
    await page.goto('/admin/users');

    await page.getByLabel('Rechercher un utilisateur').fill('e2e_candidate');
    await page.getByRole('button', { name: 'Rechercher' }).click();
    const ligne = page.locator('li', { hasText: 'e2e_candidate' });
    await expect(ligne).toBeVisible();

    await ligne.getByRole('button', { name: 'Bannir' }).click();
    await ligne.getByLabel('Motif du bannissement').fill('Test de la suite e2e');
    await ligne.getByRole('button', { name: 'Confirmer le ban' }).click();

    await expect(page.getByText('e2e_candidate est banni.')).toBeVisible();
    await expect(ligne.getByText('Banni', { exact: true })).toBeVisible();

    await ligne.getByRole('button', { name: 'Lever le ban' }).click();
    await expect(page.getByText('Le ban de e2e_candidate est levé.')).toBeVisible();
    await expect(ligne.getByText('Banni', { exact: true })).toHaveCount(0);
  });

  test('un compte banni ne peut plus se connecter', async ({ as, browser }) => {
    const admin = await as('admin');
    await admin.goto('/admin/users');
    await admin.getByLabel('Rechercher un utilisateur').fill('e2e_helper');
    await admin.getByRole('button', { name: 'Rechercher' }).click();
    const ligne = admin.locator('li', { hasText: 'e2e_helper' });
    await ligne.getByRole('button', { name: 'Bannir' }).click();
    await ligne.getByLabel('Motif du bannissement').fill('Test de connexion refusée');
    await ligne.getByRole('button', { name: 'Confirmer le ban' }).click();
    await expect(ligne.getByText('Banni', { exact: true })).toBeVisible();

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('/auth/login');
    await page.locator('input[name="email"]').fill('e2e_helper@e2e.test');
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);
    await context.close();

    await ligne.getByRole('button', { name: 'Lever le ban' }).click();
    await expect(ligne.getByText('Banni', { exact: true })).toHaveCount(0);
  });

  test('le journal d\'audit liste les actions précédentes', async ({ as }) => {
    const page = await as('admin');
    await page.goto('/admin/audit');

    await expect(page.getByRole('heading', { name: "Journal d'audit" })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });
});
