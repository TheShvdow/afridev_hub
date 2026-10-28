import type { Request, Response } from 'express';

// Connexion OAuth lancée depuis Swagger : /api/auth/{github|google}?redirect=docs.
// Le choix traverse l'aller-retour chez le fournisseur dans un cookie de courte durée,
// puis le callback renvoie sur la doc au lieu du front.
export const OAUTH_DOCS_PATH = '/api/docs';

const COOKIE = 'oauth_return';
const COOKIE_PATH = '/api/auth';

export function rememberOAuthReturn(req: Request, res: Response) {
  if (req.query['redirect'] !== 'docs') return;
  res.cookie(COOKIE, 'docs', {
    httpOnly: true,
    sameSite: 'lax', // envoyé au retour de GitHub ou Google (navigation de premier niveau)
    secure:   process.env['NODE_ENV'] === 'production',
    maxAge:   10 * 60 * 1000,
    path:     COOKIE_PATH,
  });
}

// Lit et efface le cookie : true si la connexion doit revenir sur Swagger.
export function takeOAuthReturn(req: Request, res: Response): boolean {
  const toDocs = new RegExp(String.raw`(?:^|;\s*)${COOKIE}=docs(?:;|$)`).test(req.headers.cookie ?? '');
  if (toDocs) res.clearCookie(COOKIE, { path: COOKIE_PATH });
  return toDocs;
}
