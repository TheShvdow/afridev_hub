import type { ExecutionContext } from '@nestjs/common';
import type { ThrottlerOptions } from '@nestjs/throttler';

/** Nom du compteur par adresse e-mail, à cibler dans `@Throttle({ [EMAIL_THROTTLER]: … })`. */
export const EMAIL_THROTTLER = 'email';

/** Adresse e-mail du corps de la requête, normalisée ; null si absente. */
export function bodyEmail(req: { body?: unknown }): string | null {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

/**
 * Deux compteurs :
 * - `default`, par IP (l'IP du visiteur grâce à `trust proxy`, voir main.ts) ;
 * - `email`, par adresse e-mail visée : changer d'IP ne permet pas d'essayer plus
 *   de mots de passe sur un même compte. Ignoré quand le corps n'a pas d'e-mail ;
 *   sa limite par défaut est large, les routes sensibles la resserrent.
 */
export function throttlers(env: NodeJS.ProcessEnv): ThrottlerOptions[] {
  return [
    {
      name: 'default',
      ttl: Number.parseInt(env['THROTTLE_TTL'] ?? '60000'),
      limit: Number.parseInt(env['THROTTLE_LIMIT'] ?? '60'),
    },
    {
      name: EMAIL_THROTTLER,
      ttl: 60000,
      limit: 100,
      skipIf: (context: ExecutionContext) => bodyEmail(context.switchToHttp().getRequest()) === null,
      getTracker: (req: Record<string, unknown>) => `email:${bodyEmail(req) ?? ''}`,
    },
  ];
}

/**
 * Valeur de `trust proxy` d'Express : nombre de proxys devant l'API (1 sur Render).
 * Sans elle, l'IP vue est celle du proxy et tous les visiteurs partagent le même compteur.
 */
export function trustProxy(env: NodeJS.ProcessEnv): number {
  const hops = Number.parseInt(env['TRUST_PROXY'] ?? '1');
  return Number.isNaN(hops) || hops < 0 ? 1 : hops;
}
