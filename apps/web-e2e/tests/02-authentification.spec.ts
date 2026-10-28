import { test, expect } from '@playwright/test';
import { E2E_PASSWORD, emailOf } from '../support/env';

test.describe('Authentification', () => {
  test('connexion par le formulaire puis déconnexion', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[name="email"]').fill(emailOf('author'));
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).not.toHaveURL(/\/auth\/login/);
    const compte = page.getByRole('button', { name: 'Menu du compte' });
    await expect(compte).toBeVisible();

    await compte.click();
    await expect(page.getByText('e2e_author')).toBeVisible();
    await page.getByRole('button', { name: 'Déconnexion' }).click();

    await expect(page.getByRole('link', { name: 'Rejoindre' }).first()).toBeVisible();
  });

  test('un mot de passe incorrect reste sur la connexion avec un message', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[name="email"]').fill(emailOf('author'));
    await page.locator('input[name="password"]').fill('Mauvais#Mot2Passe');
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('alert').filter({ hasText: 'incorrect' }).first()).toBeVisible();
  });

  test('l\'inscription mène à la vérification d\'e-mail, qui garde l\'adresse et refuse un faux code', async ({ page }) => {
    const suffixe = Date.now().toString(36);
    const email = `e2e_reg_${suffixe}@e2e.test`;

    await page.goto('/auth/register');
    await page.locator('input[name="username"]').fill(`e2e_reg_${suffixe}`);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    const specialite = page.locator('select').first();
    if (await specialite.count()) await specialite.selectOption({ index: 1 });
    await page.getByRole('button', { name: /Créer mon compte/ }).click();

    // L'adresse voyage dans l'URL : sans elle, la page affichait « Adresse e-mail manquante ».
    await expect(page).toHaveURL(/\/auth\/verify-email\?email=/);
    expect(new URL(page.url()).searchParams.get('email')).toBe(email);
    await expect(page.getByText(email)).toBeVisible();

    await page.getByLabel('Caractère 1').click();
    await page.keyboard.type('ABCDEF');
    await page.getByRole('button', { name: /Vérifier et continuer/ }).click();

    // La validation passe par l'API (pas de rechargement natif du formulaire) : message d'erreur, adresse conservée.
    await expect(page.getByRole('alert').filter({ hasText: 'Code invalide' }).first()).toBeVisible();
    await expect(page.getByText('Adresse e-mail manquante')).toHaveCount(0);
    await expect(page).toHaveURL(/email=/);
  });
});
