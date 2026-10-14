import { createHmac } from 'crypto';
import { verifyBictorysWebhook, WEBHOOK_REPLAY_WINDOW_MS } from './bictorys-webhook';

const SECRET = 'whsec_test';
const BODY = '{"id":"tx-1","status":"succeeded","paymentReference":"pay-1","amount":5000,"currency":"XOF"}';
const NOW = 1_800_000_000_000;

function sign(body: string, timestamp: number, secret = SECRET): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

describe('verifyBictorysWebhook', () => {
  describe('HMAC-SHA256 (X-Webhook-Signature + X-Webhook-Timestamp)', () => {
    it('accepts a correctly signed, fresh payload', () => {
      const ts = NOW;
      const headers = { signature: sign(BODY, ts), timestamp: String(ts) };
      expect(verifyBictorysWebhook(BODY, headers, SECRET, NOW)).toBe(true);
    });

    it('rejects a payload altered after signing', () => {
      const ts = NOW;
      const headers = { signature: sign(BODY, ts), timestamp: String(ts) };
      const tampered = BODY.replace('5000', '1');
      expect(verifyBictorysWebhook(tampered, headers, SECRET, NOW)).toBe(false);
    });

    it('rejects a signature made with another secret', () => {
      const ts = NOW;
      const headers = { signature: sign(BODY, ts, 'autre_secret'), timestamp: String(ts) };
      expect(verifyBictorysWebhook(BODY, headers, SECRET, NOW)).toBe(false);
    });

    it('rejects a timestamp older than the replay window', () => {
      const ts = NOW - WEBHOOK_REPLAY_WINDOW_MS - 1;
      const headers = { signature: sign(BODY, ts), timestamp: String(ts) };
      expect(verifyBictorysWebhook(BODY, headers, SECRET, NOW)).toBe(false);
    });

    it('rejects a timestamp too far in the future', () => {
      const ts = NOW + WEBHOOK_REPLAY_WINDOW_MS + 1;
      const headers = { signature: sign(BODY, ts), timestamp: String(ts) };
      expect(verifyBictorysWebhook(BODY, headers, SECRET, NOW)).toBe(false);
    });

    it('rejects a non-numeric timestamp', () => {
      const headers = { signature: sign(BODY, NOW), timestamp: 'not-a-number' };
      expect(verifyBictorysWebhook(BODY, headers, SECRET, NOW)).toBe(false);
    });

    it('rejects a signature of a different length without throwing', () => {
      const headers = { signature: 'abc', timestamp: String(NOW) };
      expect(verifyBictorysWebhook(BODY, headers, SECRET, NOW)).toBe(false);
    });
  });

  describe('static secret (X-Secret-Key)', () => {
    it('accepts the exact secret', () => {
      expect(verifyBictorysWebhook(BODY, { secretKey: SECRET }, SECRET, NOW)).toBe(true);
    });

    it('rejects a wrong secret of the same length', () => {
      expect(verifyBictorysWebhook(BODY, { secretKey: 'whsec_tesX' }, SECRET, NOW)).toBe(false);
    });

    it('rejects a secret of a different length without throwing', () => {
      expect(verifyBictorysWebhook(BODY, { secretKey: 'x' }, SECRET, NOW)).toBe(false);
    });
  });

  it('rejects a request with no authentication header', () => {
    expect(verifyBictorysWebhook(BODY, {}, SECRET, NOW)).toBe(false);
  });

  it('rejects everything when the configured secret is empty', () => {
    expect(verifyBictorysWebhook(BODY, { secretKey: '' }, '', NOW)).toBe(false);
  });
});
