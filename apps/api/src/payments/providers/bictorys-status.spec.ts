import { mapBictorysStatus } from './bictorys-status';

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
