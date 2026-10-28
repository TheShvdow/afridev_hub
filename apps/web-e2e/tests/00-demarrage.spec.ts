import { test, expect } from '@playwright/test';
import { API_URL } from '../support/env';

test('l\'API répond et le front s\'affiche', async ({ page, request }) => {
  const health = await request.get(API_URL.replace(/\/api$/, '') + '/health');
  expect((await health.json()).data.db).toBe('ok');

  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();
});
