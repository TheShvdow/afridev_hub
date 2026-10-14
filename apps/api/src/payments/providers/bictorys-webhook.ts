import { createHmac, timingSafeEqual } from 'crypto';

// Vérification des webhooks Bictorys — doc « Comment valider les webhooks ».
// Deux méthodes : HMAC-SHA256 si X-Webhook-Signature est présent (fenêtre de 5 minutes),
// sinon secret statique dans X-Secret-Key. Comparaison à temps constant dans les deux cas.

export const WEBHOOK_REPLAY_WINDOW_MS = 5 * 60 * 1000;

export interface BictorysWebhookHeaders {
  signature?: string;
  timestamp?: string;
  secretKey?: string;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyBictorysWebhook(
  rawBody: string,
  headers: BictorysWebhookHeaders,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!secret) return false;

  if (headers.signature && headers.timestamp) {
    const ts = Number.parseInt(headers.timestamp, 10);
    if (Number.isNaN(ts) || Math.abs(now - ts) > WEBHOOK_REPLAY_WINDOW_MS) return false;

    const expected = createHmac('sha256', secret)
      .update(`${headers.timestamp}.${rawBody}`)
      .digest('hex');
    return safeEqual(headers.signature, expected);
  }

  if (headers.secretKey) {
    return safeEqual(headers.secretKey, secret);
  }

  return false;
}
