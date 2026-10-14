// Statuts Bictorys (guide d'intégration) → issue côté AfriDev Hub.
// `authorized` (pré-autorisation carte) n'est pas un succès : il attend une capture.

export type PaymentOutcome = 'CAPTURED' | 'FAILED' | 'PENDING' | 'IGNORED';

export function mapBictorysStatus(status: string): PaymentOutcome {
  switch (status) {
    case 'succeeded':
      return 'CAPTURED';
    case 'failed':
    case 'cancelled':
    case 'reversed':
    case 'expired':
      return 'FAILED';
    case 'pending':
    case 'processing':
    case 'authorized':
      return 'PENDING';
    default:
      return 'IGNORED';
  }
}
