import * as Sentry from '@sentry/node';

let enabled = false;

/** Active Sentry quand `SENTRY_DSN` est défini ; sans lui, rien n'est envoyé nulle part. */
export function initMonitoring(env: NodeJS.ProcessEnv = process.env): boolean {
  const dsn = env.SENTRY_DSN?.trim();
  if (!dsn || !/^https:\/\//.test(dsn)) return false;

  Sentry.init({
    dsn,
    environment: env.NODE_ENV ?? 'development',
    release: env.RENDER_GIT_COMMIT,
    tracesSampleRate: 0,
    sendDefaultPii: false,
  });
  enabled = true;
  return true;
}

/** Erreur serveur (5xx) : envoyée avec la route et le statut, jamais le corps ni les en-têtes. */
export function captureServerError(exception: unknown, context: { method?: string; path?: string; status: number }): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    scope.setTag('http.status', String(context.status));
    scope.setTag('http.route', `${context.method ?? '?'} ${context.path ?? '?'}`);
    Sentry.captureException(exception);
  });
}

export const isMonitoringEnabled = (): boolean => enabled;
