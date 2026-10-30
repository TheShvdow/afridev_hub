import * as fs from 'fs';
import * as path from 'path';
import { AUTH_DIR, loginAll, tokensStillValid } from './support/api';
import { cleanup, createUsers, disconnect, resetContent, usersExist } from './support/db';

// Repart d'un état propre (restes d'une exécution interrompue), crée les comptes puis les connecte.
// `E2E_REUSE=1` réutilise les comptes et jetons d'une exécution précédente (itérer sans attendre les limites de connexion).
export default async function globalSetup(): Promise<void> {
  if (process.env['E2E_REUSE'] === '1' && fs.existsSync(path.join(AUTH_DIR, 'admin.json'))) {
    const reusable = await usersExist();
    if (reusable) await resetContent();
    await disconnect();
    if (reusable && (await tokensStillValid())) return;
    if (reusable) {
      await loginAll();
      return;
    }
  }

  await cleanup();
  await createUsers();
  await disconnect();
  await loginAll();
}
