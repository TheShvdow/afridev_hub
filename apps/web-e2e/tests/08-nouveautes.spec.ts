import { test, expect } from '@playwright/test';
import { apiAs, createQuestionWithBody } from '../support/api';
import { API_URL, E2E_PASSWORD, emailOf, uniqueTitle } from '../support/env';

// Fonctions ajoutées en fin de phase 1 : pages légales, recherche du forum, Markdown, bienvenue, mot de passe oublié.
test.describe('Nouveautés', () => {
  const PAGES = [
    { url: '/conditions-generales', titre: /Conditions générales d'utilisation/ },
    { url: '/confidentialite', titre: /Politique de confidentialité/ },
    { url: '/cookies', titre: /Cookies et stockage local/ },
    { url: '/mentions-legales', titre: /Mentions légales/ },
  ];

  for (const { url, titre } of PAGES) {
    test(`la page ${url} s'affiche et renvoie vers les autres pages légales`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titre);
      await expect(page.getByRole('navigation', { name: 'Autres pages légales' }).getByRole('link')).toHaveCount(3);
    });
  }

  test('le pied de page propose les pages légales', async ({ page }) => {
    await page.goto('/');
    const liens = page.getByRole('navigation', { name: 'Informations légales' });
    await expect(liens.getByRole('link')).toHaveCount(4);
    await liens.getByRole('link', { name: 'Confidentialité' }).click();
    await expect(page).toHaveURL(/\/confidentialite$/);
  });

  test('l\'inscription renvoie vers les conditions et la confidentialité', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByRole('link', { name: "conditions d'utilisation" })).toHaveAttribute('href', '/conditions-generales');
    await expect(page.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite');
  });

  test.describe('forum : recherche et Markdown', () => {
    const jeton = `Zq${Date.now().toString(36)}`;
    const titre = uniqueTitle(`Recherche ${jeton}`);
    let questionId = '';

    test.beforeAll(async () => {
      questionId = await createQuestionWithBody(
        'author',
        titre,
        [
          'Voici un texte avec **du gras**, du `code en ligne` et un [lien](https://exemple.com/doc).',
          '',
          '- premier point',
          '- second point',
          '',
          '<script>window.__xss = true</script>',
        ].join('\n'),
      );
    });

    test('la recherche filtre la liste, se reflète dans l\'adresse et s\'efface', async ({ page }) => {
      await page.goto('/forum');
      const champ = page.locator('#forum-search');
      await expect(page.locator('app-card-thread').first()).toBeVisible();

      await champ.fill(jeton);
      await expect(page).toHaveURL(new RegExp(`q=${jeton}`));
      await expect(page.locator('app-card-thread')).toHaveCount(1);
      await expect(page.locator('app-card-thread', { hasText: titre })).toBeVisible();

      await page.getByRole('button', { name: 'Effacer' }).click();
      await expect(page).not.toHaveURL(/q=/);
      expect(await page.locator('app-card-thread').count()).toBeGreaterThan(1);
    });

    test('une recherche sans résultat l\'indique', async ({ page }) => {
      await page.goto(`/forum?q=${jeton}introuvable`);
      await expect(page.locator('app-card-thread')).toHaveCount(0);
      await expect(page.getByText(jeton + 'introuvable').first()).toBeVisible();
    });

    test('le corps de la question est mis en forme et le HTML saisi reste du texte', async ({ page }) => {
      await page.goto(`/forum/${questionId}`);
      const corps = page.locator('.markdown').first();

      await expect(corps.locator('strong')).toHaveText('du gras');
      await expect(corps.locator('code')).toHaveText('code en ligne');
      await expect(corps.locator('li')).toHaveCount(2);
      const lien = corps.getByRole('link', { name: 'lien' });
      await expect(lien).toHaveAttribute('href', 'https://exemple.com/doc');
      await expect(lien).toHaveAttribute('rel', /noopener/);

      await expect(corps).toContainText('<script>');
      expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();
    });
  });

  test('un profil vide passe par les trois écrans de bienvenue', async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('input[name="email"]').fill(emailOf('newbie'));
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.getByRole('button', { name: 'Se connecter' }).click();

    await expect(page).toHaveURL(/\/bienvenue/);
    await expect(page.getByText('Étape 1 sur 3')).toBeVisible();
    await page.locator('#onb-country').selectOption('SN');
    await page.locator('#onb-city').fill('Dakar');
    await page.getByRole('button', { name: 'Suivant' }).click();

    await expect(page.getByText('Étape 2 sur 3')).toBeVisible();
    await page.getByRole('button', { name: 'Senior' }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    await expect(page.getByText('Étape 3 sur 3')).toBeVisible();
    await page.getByLabel('Ajouter une technologie').fill('Angular');
    await page.getByLabel('Ajouter une technologie').press('Enter');
    await expect(page.getByText('Angular')).toBeVisible();
    await page.getByRole('button', { name: 'Terminer' }).click();

    await expect(page).not.toHaveURL(/\/bienvenue/);

    // Le profil est bien enregistré côté API.
    const api = await apiAs('newbie');
    const reponse = await api.get(`${API_URL}/auth/me`);
    const profil = ((await reponse.json()) as { data: { country: string; level: string; stack: string[] } }).data;
    await api.dispose();
    expect(profil.country).toBe('SN');
    expect(profil.level).toBe('SENIOR');
    expect(profil.stack).toEqual(['Angular']);
  });

  test('mot de passe oublié : une adresse inconnue donne la même réponse qu\'une adresse connue', async ({ page }) => {
    await page.goto('/auth/forgot-password');
    await page.locator('input[name="email"]').fill('inconnu-e2e@e2e.test');
    await page.getByRole('button', { name: /Recevoir un code/ }).click();

    // Pas de « compte introuvable » : on arrive à la saisie du code dans tous les cas.
    await expect(page).toHaveURL(/\/auth\/reset-password\?email=/);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
});
