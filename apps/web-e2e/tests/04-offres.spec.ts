import { test, expect } from '../support/fixtures';
import { findJobId } from '../support/api';
import { uniqueTitle } from '../support/env';

// Parcours d'une offre : le recruteur publie, la modération valide, un candidat postule, le recruteur lit la candidature,
// modifie puis clôture son offre.
test.describe.serial('Offres d\'emploi', () => {
  const titre = uniqueTitle('Développeur Angular');
  const message = 'Je suis motivé par ce poste : trois ans d\'expérience Angular et NestJS en environnement fintech.';
  let jobId = '';

  test('le recruteur publie une offre, elle attend la validation', async ({ as }) => {
    const page = await as('recruiter');
    await page.goto('/jobs/post');

    await page.locator('#job-title').fill(titre);
    await page.locator('#job-company').fill('E2E Corp');
    await page.locator('#job-country').selectOption('SN');
    await page.locator('#job-salary-min').fill('500000');
    await page.locator('#job-salary-max').fill('800000');
    await page.locator('#job-stack').fill('Angular, NestJS');
    await page.locator('#job-description').fill('Nous cherchons un développeur Angular pour construire une plateforme de paiement. '.repeat(2));
    await page.getByRole('button', { name: "Soumettre l'offre" }).click();

    await expect(page).toHaveURL(/\/jobs\/mine$/);
    const offre = page.locator('li', { hasText: titre });
    await expect(offre).toBeVisible();
    await expect(offre.getByText('En attente de validation')).toBeVisible();
    jobId = await findJobId('recruiter', titre);
  });

  test('un salaire minimum supérieur au maximum est refusé par le formulaire', async ({ as }) => {
    const page = await as('recruiter');
    await page.goto('/jobs/post');

    await page.locator('#job-title').fill('Offre invalide');
    await page.locator('#job-salary-min').fill('900000');
    await page.locator('#job-salary-max').fill('500000');
    await page.locator('#job-salary-max').blur();

    await expect(page.getByText('Le salaire minimum ne peut pas dépasser le maximum.')).toBeVisible();
  });

  test('l\'offre n\'est pas visible publiquement avant validation', async ({ page }) => {
    await page.goto('/jobs');
    await expect(page.locator('app-card-job').first()).toBeVisible();

    await expect(page.locator('app-card-job', { hasText: titre })).toHaveCount(0);
  });

  test('la modération publie l\'offre', async ({ as }) => {
    const page = await as('mod');
    await page.goto('/admin/jobs');

    const offre = page.locator('li', { hasText: titre });
    await expect(offre).toBeVisible();
    await offre.getByRole('button', { name: 'Publier' }).click();

    await expect(page.getByText('Offre publiée.')).toBeVisible();
    await expect(page.locator('li', { hasText: titre })).toHaveCount(0);
  });

  test('l\'offre est en ligne chez le recruteur et visible dans la liste publique', async ({ as, page }) => {
    const recruteur = await as('recruiter');
    await recruteur.goto('/jobs/mine');
    await expect(recruteur.locator('li', { hasText: titre }).getByText('En ligne')).toBeVisible();

    await page.goto('/jobs');
    await expect(page.locator('app-card-job', { hasText: titre })).toBeVisible();
  });

  test('un candidat postule avec ses informations, une seconde candidature est refusée', async ({ as }) => {
    const page = await as('candidate');
    await page.goto(`/jobs/${jobId}/apply`);

    // Le nom est prérempli depuis le compte.
    await expect(page.locator('#apply-fullname')).toHaveValue('E2E candidate');
    await page.locator('#apply-phone').fill('+221 77 123 45 67');
    await page.locator('#apply-city').fill('Dakar');
    await page.locator('#apply-github').fill('https://github.com/e2e-candidate');
    await page.locator('#apply-exp').fill('3');
    await page.locator('#apply-stack').fill('Angular, NestJS');
    await page.locator('#application-message').fill(message);
    await page.getByRole('button', { name: 'Envoyer ma candidature' }).click();

    await expect(page.getByText('Votre candidature a été envoyée')).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/jobs/${jobId}$`));

    await page.goto(`/jobs/${jobId}/apply`);
    await page.locator('#application-message').fill(message);
    await page.getByRole('button', { name: 'Envoyer ma candidature' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'déjà postulé' }).first()).toBeVisible();
  });

  test('le candidat ne peut pas envoyer sans message ni avec un lien invalide', async ({ as }) => {
    const page = await as('candidate');
    await page.goto(`/jobs/${jobId}/apply`);

    await page.locator('#apply-github').fill('github.com/sans-protocole');
    await page.locator('#apply-github').blur();
    await page.getByRole('button', { name: 'Envoyer ma candidature' }).click();

    await expect(page.getByText('Saisissez une adresse complète').first()).toBeVisible();
    await expect(page.getByText('Le message est requis.')).toBeVisible();
  });

  test('le recruteur lit la candidature reçue avec toutes les informations', async ({ as }) => {
    const page = await as('recruiter');
    await page.goto('/jobs/mine');

    const offre = page.locator('li', { hasText: titre });
    await expect(offre.getByText('1 candidature')).toBeVisible();
    await offre.getByRole('button', { name: /Voir les candidatures/ }).click();

    await expect(offre.getByText('e2e_candidate')).toBeVisible();
    await expect(offre.getByText('+221 77 123 45 67')).toBeVisible();
    await expect(offre.getByText('Dakar')).toBeVisible();
    await expect(offre.getByText('3 ans')).toBeVisible();
    await expect(offre.getByText('Angular, NestJS')).toBeVisible();
    await expect(offre.getByText(message)).toBeVisible();
    await expect(offre.getByRole('link', { name: 'GitHub' })).toHaveAttribute('href', 'https://github.com/e2e-candidate');
  });

  test('le recruteur modifie le salaire puis clôture l\'offre', async ({ as }) => {
    const page = await as('recruiter');
    await page.goto('/jobs/mine');

    await page.locator('li', { hasText: titre }).getByRole('link', { name: 'Modifier' }).click();
    await expect(page.locator('#job-title')).toHaveValue(titre);
    await page.locator('#job-salary-max').fill('900000');
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();

    await expect(page.getByText('Offre mise à jour.')).toBeVisible();
    await expect(page).toHaveURL(/\/jobs\/mine$/);

    const offre = page.locator('li', { hasText: titre });
    await expect(offre).toContainText('900');
    await offre.getByRole('button', { name: 'Clôturer' }).click();
    await offre.getByRole('button', { name: 'Confirmer' }).click();

    await expect(offre.getByText('Clôturée')).toBeVisible();
    await expect(offre.getByRole('link', { name: 'Modifier' })).toHaveCount(0);
  });

  test('le candidat crée puis supprime une alerte emploi', async ({ as }) => {
    const page = await as('candidate');
    await page.goto('/jobs/alerts');

    await page.locator('#alert-country').selectOption('SN');
    await page.locator('#alert-stack').fill('angular, nestjs');
    await page.getByRole('button', { name: "Créer l'alerte" }).click();

    await expect(page.getByText('Alerte créée')).toBeVisible();
    const alerte = page.locator('li', { hasText: 'angular, nestjs' });
    await expect(alerte).toBeVisible();
    await expect(alerte.getByText('Sénégal')).toBeVisible();

    await alerte.getByRole('button', { name: 'Supprimer' }).click();
    await alerte.getByRole('button', { name: 'Confirmer' }).click();
    await expect(page.getByText('Alerte supprimée.')).toBeVisible();
  });

  test('une alerte sans aucun critère est refusée', async ({ as }) => {
    const page = await as('candidate');
    await page.goto('/jobs/alerts');

    await page.getByRole('button', { name: "Créer l'alerte" }).click();

    await expect(page.getByText('au moins un critère')).toBeVisible();
  });
});
