import { cleanup, disconnect } from './support/db';

// Supprime les comptes et contenus créés par la suite. `E2E_KEEP=1` les conserve pour inspecter l'état après un échec.
export default async function globalTeardown(): Promise<void> {
  if (process.env['E2E_KEEP'] === '1' || process.env['E2E_REUSE'] === '1') return;
  const { users } = await cleanup();
  console.log(`[e2e] ${users} compte(s) de test supprimé(s).`);
  await disconnect();
}
