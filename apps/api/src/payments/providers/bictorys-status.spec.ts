import { mapBictorysStatus, isOutcomeConfirmed } from './bictorys-status';

describe('mapBictorysStatus', () => {
  it.each([
    ['succeeded', 'CAPTURED'],
  ])('maps %s to %s', (status, outcome) => {
    expect(mapBictorysStatus(status)).toBe(outcome);
  });

  it.each(['failed', 'cancelled', 'reversed', 'expired'])('maps %s to FAILED', (status) => {
    expect(mapBictorysStatus(status)).toBe('FAILED');
  });

  it.each(['pending', 'processing', 'authorized'])('keeps %s pending (no state change)', (status) => {
    expect(mapBictorysStatus(status)).toBe('PENDING');
  });

  it('ignores unknown statuses instead of guessing', () => {
    expect(mapBictorysStatus('réussi')).toBe('IGNORED');
    expect(mapBictorysStatus('')).toBe('IGNORED');
  });
});

describe('isOutcomeConfirmed', () => {
  it('confirms a succeeded webhook when Bictorys also reports succeeded', () => {
    expect(isOutcomeConfirmed('succeeded', 'succeeded')).toBe(true);
  });

  it('confirms a failed webhook when Bictorys reports a failure', () => {
    expect(isOutcomeConfirmed('failed', 'cancelled')).toBe(true);
  });

  it('rejects a succeeded webhook that Bictorys still reports as pending', () => {
    expect(isOutcomeConfirmed('succeeded', 'pending')).toBe(false);
  });

  it('rejects a succeeded webhook contradicted by Bictorys (failed)', () => {
    expect(isOutcomeConfirmed('succeeded', 'failed')).toBe(false);
  });

  it('never confirms a pending webhook', () => {
    expect(isOutcomeConfirmed('pending', 'pending')).toBe(false);
  });
});
