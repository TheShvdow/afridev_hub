import { captureServerError, initMonitoring, isMonitoringEnabled } from './monitoring';

describe('monitoring', () => {
  it('reste inactif sans DSN ou avec un DSN non https', () => {
    expect(initMonitoring({} as NodeJS.ProcessEnv)).toBe(false);
    expect(initMonitoring({ SENTRY_DSN: ' ' } as NodeJS.ProcessEnv)).toBe(false);
    expect(initMonitoring({ SENTRY_DSN: 'http://cle@local.invalid/1' } as NodeJS.ProcessEnv)).toBe(false);
    expect(isMonitoringEnabled()).toBe(false);
  });

  it('ne fait rien quand il est inactif', () => {
    expect(() => captureServerError(new Error('x'), { status: 500 })).not.toThrow();
  });
});
