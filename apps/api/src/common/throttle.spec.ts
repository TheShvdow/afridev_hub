import type { ExecutionContext } from '@nestjs/common';
import { bodyEmail, EMAIL_THROTTLER, throttlers, trustProxy } from './throttle';

const contextFor = (body: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ body }) }) }) as unknown as ExecutionContext;

describe('throttle', () => {
  it('normalise l’e-mail du corps et ignore les valeurs absentes ou vides', () => {
    expect(bodyEmail({ body: { email: '  Aminata@Demo.Afridev.Hub ' } })).toBe('aminata@demo.afridev.hub');
    expect(bodyEmail({ body: { email: '   ' } })).toBeNull();
    expect(bodyEmail({ body: { email: 42 } })).toBeNull();
    expect(bodyEmail({})).toBeNull();
  });

  it('compte par e-mail : même clé quelle que soit la casse, ignoré sans e-mail', async () => {
    const email = throttlers({}).find((t) => t.name === EMAIL_THROTTLER)!;

    const a = await email.getTracker!({ body: { email: 'X@Y.io' } }, contextFor({}));
    const b = await email.getTracker!({ body: { email: 'x@y.io ' } }, contextFor({}));
    expect(a).toBe(b);
    expect(email.skipIf!(contextFor({ email: 'x@y.io' }))).toBe(false);
    expect(email.skipIf!(contextFor({}))).toBe(true);
  });

  it('garde la limite globale par IP configurable', () => {
    const def = throttlers({ THROTTLE_TTL: '1000', THROTTLE_LIMIT: '7' }).find((t) => t.name === 'default')!;
    expect(def).toMatchObject({ ttl: 1000, limit: 7 });
  });

  it('fait confiance à un proxy par défaut, configurable par TRUST_PROXY', () => {
    expect(trustProxy({})).toBe(1);
    expect(trustProxy({ TRUST_PROXY: '0' })).toBe(0);
    expect(trustProxy({ TRUST_PROXY: '2' })).toBe(2);
    expect(trustProxy({ TRUST_PROXY: 'abc' })).toBe(1);
  });
});
