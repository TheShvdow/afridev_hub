import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Adresses et identifiants de la suite. Tout se règle par variables d'environnement.
export const WEB_URL = process.env['E2E_WEB_URL'] ?? 'http://localhost:4200';
export const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000/api';

/**
 * Mot de passe des comptes e2e_*, créés pour la suite puis supprimés à la fin : tiré au hasard à chaque exécution
 * (jamais écrit dans le code), sauf si `E2E_PASSWORD` est fourni. Avec `E2E_REUSE=1`, celui de l'exécution précédente
 * est repris, car les comptes conservés gardent leur mot de passe. Il est publié dans l'environnement pour que les
 * processus de test lancés ensuite utilisent le même.
 */
function resolvePassword(): string {
  const fromEnv = process.env['E2E_PASSWORD'];
  if (fromEnv) return fromEnv;

  const file = path.join(__dirname, '..', '.auth', 'password');
  let password: string;
  if (process.env['E2E_REUSE'] === '1' && fs.existsSync(file)) {
    password = fs.readFileSync(file, 'utf-8').trim();
  } else {
    password = `${randomBytes(12).toString('base64url')}#9aZ`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, password, { mode: 0o600 });
  }
  process.env['E2E_PASSWORD'] = password;
  return password;
}

export const E2E_PASSWORD = resolvePassword();

/** Préfixe des comptes et des contenus créés par la suite : c'est lui qui permet de tout nettoyer. */
export const E2E_PREFIX = 'e2e_';

/** Clés des comptes disponibles dans les tests. */
export type UserKey = 'author' | 'helper' | 'candidate' | 'recruiter' | 'mod' | 'admin' | 'newbie';

export const USERS: Record<UserKey, { username: string; role: 'MEMBER' | 'MODERATOR' | 'ADMIN'; reputation: number; recruiter?: boolean; blank?: boolean }> = {
  author: { username: 'e2e_author', role: 'MEMBER', reputation: 50 },
  helper: { username: 'e2e_helper', role: 'MEMBER', reputation: 50 },
  candidate: { username: 'e2e_candidate', role: 'MEMBER', reputation: 20 },
  recruiter: { username: 'e2e_recruiter', role: 'MEMBER', reputation: 20, recruiter: true },
  mod: { username: 'e2e_mod', role: 'MODERATOR', reputation: 100 },
  admin: { username: 'e2e_admin', role: 'ADMIN', reputation: 100 },
  /** Profil vide (ni pays, ni niveau, ni technologies) : sert au parcours de bienvenue. */
  newbie: { username: 'e2e_newbie', role: 'MEMBER', reputation: 0, blank: true },
};

export const emailOf = (key: UserKey): string => `${USERS[key].username}@e2e.test`;

/** Titre unique par exécution, repérable par le nettoyage. */
export const uniqueTitle = (label: string): string => `[E2E] ${label} ${Date.now().toString(36)}`;
