import { test, expect, openThread } from '../support/fixtures';

test.describe('Visiteur sans compte', () => {
  for (const [route, titre] of [
    ['/', 'AfriDev'],
    ['/forum', 'Forum'],
    ['/jobs', 'Offres d.emploi'],
    ['/projets', 'Projets'],
  ] as const) {
    test(`la page ${route} se charge avec la barre de navigation`, async ({ page }) => {
      await page.goto(route);

      await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Rejoindre' }).first()).toBeVisible();
      await expect(page).toHaveTitle(new RegExp(titre, 'i'));
    });
  }

  test('le forum liste des questions et ouvre la discussion dans une fenêtre sans proposer de voter', async ({ page }) => {
    await page.goto('/forum');

    const cartes = page.locator('app-card-thread');
    await expect(cartes.first()).toBeVisible();
    const fenetre = await openThread(page, cartes.first());

    await expect(fenetre.getByRole('button', { name: /Voter/ })).toHaveCount(0);
    await expect(fenetre.getByRole('button', { name: 'Signaler' })).toHaveCount(0);
  });

  for (const route of ['/jobs/post', '/jobs/mine', '/jobs/alerts', '/notifications', '/forum/ask']) {
    test(`${route} renvoie vers la connexion`, async ({ page }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/auth\/login/);
    });
  }

  test('l\'administration est interdite : retour vers la connexion', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
