import { webhookAmountMatches } from './bictorys-amount';

describe('webhookAmountMatches', () => {
  it('accepts the exact price', () => {
    expect(webhookAmountMatches({ amount: 25000 }, 25000)).toBe(true);
  });

  it('accepts the price plus the fees paid by the customer', () => {
    expect(webhookAmountMatches({ amount: 25507.53, customerFees: 507.53 }, 25000)).toBe(true);
  });

  it('refuses a lower amount, even with fees', () => {
    expect(webhookAmountMatches({ amount: 100, customerFees: 2 }, 25000)).toBe(false);
  });

  it('refuses a higher amount that fees do not explain', () => {
    expect(webhookAmountMatches({ amount: 25507.53 }, 25000)).toBe(false);
    expect(webhookAmountMatches({ amount: 25507.53, customerFees: 10 }, 25000)).toBe(false);
  });

  it('refuses a missing amount', () => {
    expect(webhookAmountMatches({}, 25000)).toBe(false);
  });
});
