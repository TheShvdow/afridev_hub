// Montant d'un webhook Bictorys. Vu en sandbox le 2026-10-28 : pour un prix de 25 000, `amount`
// vaut 25 507,53 (prix + frais payés par le client, `customerFees`). Le prix du catalogue doit donc
// se retrouver soit dans `amount`, soit dans `amount - customerFees`, à un centime près.
const TOLERANCE = 0.01;

const num = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

export function webhookAmountMatches(payload: { amount?: unknown; customerFees?: unknown }, expected: number): boolean {
  const amount = num(payload.amount);
  if (amount === null) return false;
  if (Math.abs(amount - expected) <= TOLERANCE) return true;

  const fees = num(payload.customerFees);
  return fees !== null && fees > 0 && Math.abs(amount - fees - expected) <= TOLERANCE;
}
