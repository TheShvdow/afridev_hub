import * as path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { WEB_URL } from './support/env';

// Suite de bout en bout du front contre l'API réelle. Prérequis et lancement : voir README.md.
export default defineConfig({
  testDir: './tests',
  outputDir: path.join(__dirname, 'test-results'),
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  // Les scénarios se partagent la même base : en série, dans l'ordre des fichiers.
  fullyParallel: false,
  workers: 1,
  retries: process.env['CI'] ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }]],
  use: {
    baseURL: WEB_URL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
