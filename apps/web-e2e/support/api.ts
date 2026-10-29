import { APIRequestContext, request } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { API_URL, E2E_PASSWORD, USERS, UserKey, emailOf } from './env';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export const AUTH_DIR = path.join(__dirname, '..', '.auth');
const tokenFile = (key: UserKey) => path.join(AUTH_DIR, `${key}.json`);

/** Connexion par l'API, une seule fois par compte : les tests posent ensuite les jetons dans le navigateur. */
export async function loginAll(): Promise<void> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const api = await request.newContext();

  for (const key of Object.keys(USERS) as UserKey[]) {
    const data = await login(api, key);
    fs.writeFileSync(tokenFile(key), JSON.stringify(data));
  }

  await api.dispose();
}

/** La route de connexion est limitée à 10 appels par minute : en cas de 429, on attend la fenêtre suivante. */
async function login(api: APIRequestContext, key: UserKey): Promise<Tokens> {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await api.post(`${API_URL}/auth/login`, { data: { email: emailOf(key), password: E2E_PASSWORD } });
    if (response.status() === 429) {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      continue;
    }
    if (!response.ok()) throw new Error(`Connexion de ${key} impossible : ${response.status()} ${await response.text()}`);
    return ((await response.json()) as { data: Tokens }).data;
  }
  throw new Error(`Connexion de ${key} impossible : limite de requêtes de l'API atteinte.`);
}

/** Vrai quand les jetons enregistrés de chaque compte existent et sont encore acceptés par l'API. */
export async function tokensStillValid(): Promise<boolean> {
  try {
    for (const key of Object.keys(USERS) as UserKey[]) {
      const api = await request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${tokensOf(key).accessToken}` } });
      const response = await api.get(`${API_URL}/auth/me`);
      await api.dispose();
      if (!response.ok()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function tokensOf(key: UserKey): Tokens {
  return JSON.parse(fs.readFileSync(tokenFile(key), 'utf-8')) as Tokens;
}

/** Client d'API authentifié en tant que `key`, pour préparer des données sans passer par l'interface. */
export async function apiAs(key: UserKey): Promise<APIRequestContext> {
  return request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${tokensOf(key).accessToken}` } });
}

async function post<T>(key: UserKey, route: string, data: unknown): Promise<T> {
  const api = await apiAs(key);
  const response = await api.post(`${API_URL}${route}`, { data });
  if (!response.ok()) throw new Error(`POST ${route} (${key}) : ${response.status()} ${await response.text()}`);
  const body = (await response.json()) as { data: T };
  await api.dispose();
  return body.data;
}

/** Question dont le corps est fourni (pour vérifier son rendu). */
export async function createQuestionWithBody(key: UserKey, title: string, body: string): Promise<string> {
  const post_ = await post<{ id: string }>(key, '/forum/posts', { title, body, tags: ['e2e'] });
  return post_.id;
}

export async function createQuestion(key: UserKey, title: string): Promise<string> {
  const post_ = await post<{ id: string }>(key, '/forum/posts', {
    title,
    body: 'Question créée par la suite de bout en bout pour vérifier le parcours du forum de bout en bout.',
    tags: ['e2e', 'angular'],
  });
  return post_.id;
}

export async function createAnswer(key: UserKey, postId: string, body: string): Promise<string> {
  return (await post<{ id: string }>(key, `/forum/posts/${postId}/answers`, { body })).id;
}

async function get<T>(key: UserKey, route: string): Promise<T> {
  const api = await apiAs(key);
  const response = await api.get(`${API_URL}${route}`);
  if (!response.ok()) throw new Error(`GET ${route} (${key}) : ${response.status()} ${await response.text()}`);
  const body = (await response.json()) as { data: T };
  await api.dispose();
  return body.data;
}

/** Retrouve une question récente par son titre exact. */
export async function findQuestionId(key: UserKey, title: string): Promise<string> {
  const api = await apiAs(key);
  const response = await api.get(`${API_URL}/forum/posts?limit=20&sort=newest`);
  const { data } = (await response.json()) as { data: { id: string; title: string }[] };
  await api.dispose();
  const found = data.find((post) => post.title === title);
  if (!found) throw new Error(`Question « ${title} » introuvable dans les 20 plus récentes.`);
  return found.id;
}

/** Retrouve une de ses offres par son titre exact. */
export async function findJobId(key: UserKey, title: string): Promise<string> {
  const jobs = await get<{ id: string; title: string }[]>(key, '/jobs/mine');
  const found = jobs.find((job) => job.title === title);
  if (!found) throw new Error(`Offre « ${title} » introuvable dans « mes offres ».`);
  return found.id;
}
