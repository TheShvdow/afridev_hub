import type { ChargeResponse } from './payment-provider.interface';

// Bictorys répond de deux façons selon le mode : appel direct (transactionId, redirectUrl) ou
// checkout hébergé, vérifié en sandbox le 2026-10-28 : { type: 'CheckoutLinkObject', link, chargeId }.
// Dans les deux cas, l'identifiant sert à lire le statut (GET /pay/v1/transactions/{id}/status).
export function normalizeCharge(data: unknown): ChargeResponse {
  const raw = (data ?? {}) as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === 'string' && value ? value : undefined);

  const transactionId = text(raw['transactionId']) ?? text(raw['chargeId']);
  const redirectUrl = text(raw['redirectUrl']) ?? text(raw['link']);
  if (!transactionId || !redirectUrl) {
    throw new Error('Réponse Bictorys sans identifiant ou sans lien de paiement.');
  }

  return {
    transactionId,
    redirectUrl,
    ...(text(raw['link']) && { link: text(raw['link']) }),
    ...(text(raw['qrCode']) && { qrCode: text(raw['qrCode']) }),
    ...(text(raw['message']) && { message: text(raw['message']) }),
  };
}
