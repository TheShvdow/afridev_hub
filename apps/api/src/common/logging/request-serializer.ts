// Journalise la route sans sa query string : des tokens transitent dans l'URL
// (lien de vérification d'email, code OAuth) et ne doivent pas finir dans les logs.
export interface LoggableRequest {
  id?: unknown;
  method?: string;
  url?: string;
  remoteAddress?: string;
}

export function serializeRequest(req: LoggableRequest) {
  return {
    id:            req.id,
    method:        req.method,
    url:           req.url?.split('?')[0],
    remoteAddress: req.remoteAddress,
  };
}
