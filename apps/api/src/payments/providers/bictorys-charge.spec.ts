import { normalizeCharge } from './bictorys-charge';

describe('normalizeCharge', () => {
  it('reads the hosted checkout answer (chargeId + link)', () => {
    expect(normalizeCharge({ type: 'CheckoutLinkObject', link: 'https://pay/x', chargeId: 'c1', opToken: 't' })).toEqual({
      transactionId: 'c1', redirectUrl: 'https://pay/x', link: 'https://pay/x',
    });
  });

  it('reads the direct API answer (transactionId + redirectUrl)', () => {
    expect(normalizeCharge({ transactionId: 't1', redirectUrl: 'https://pay/y', message: 'ok' })).toEqual({
      transactionId: 't1', redirectUrl: 'https://pay/y', message: 'ok',
    });
  });

  it('rejects an answer without identifier or link', () => {
    expect(() => normalizeCharge({ type: 'CheckoutLinkObject' })).toThrow();
  });
});
