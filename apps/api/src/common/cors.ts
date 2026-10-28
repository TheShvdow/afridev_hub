// Origines autorisées par CORS : le front principal (WEB_URL, repris dans les liens des e-mails et
// les redirections OAuth) plus des origines supplémentaires facultatives (CORS_ORIGINS, séparées par
// des virgules), par exemple l'adresse d'un déploiement d'aperçu.
export function corsOrigins(env: Record<string, string | undefined>): string[] {
  const main = env['WEB_URL']?.trim() || 'http://localhost:4200';
  const extra = (env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return [...new Set([main.replace(/\/+$/, ''), ...extra])];
}
