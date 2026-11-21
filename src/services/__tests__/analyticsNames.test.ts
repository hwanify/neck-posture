import { describe, expect, it, jest } from '@jest/globals';

// Names Firebase Analytics reserves for its own events (logEvent rejects them).
const RESERVED = ['first_open', 'session_start', 'user_engagement', 'app_update', 'os_update', 'error', 'app_remove'];
const logged: string[] = [];

jest.mock('@react-native-firebase/analytics', () => ({
  getAnalytics: () => ({}),
  logEvent: (_: unknown, name: string) => {
    logged.push(name);
    return Promise.resolve();
  },
  setAnalyticsCollectionEnabled: () => Promise.resolve(),
}));

describe('analytics event names', () => {
  it('never uses a name Firebase reserves', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { analytics } = require('../analytics') as typeof import('../analytics');
    analytics.onboardingComplete();
    analytics.calibrationComplete(true);
    analytics.sessionStart('airpods');
    analytics.sessionEnd({ judgedSec: 600, goodRatio: 0.8, alerts: 3, source: 'airpods' });
    analytics.settingsChange('posture.enterDeg');
    analytics.reviewPrompt();
    analytics.contactTap();
    analytics.reportOpen('history');
    expect(logged).toHaveLength(8);
    for (const name of logged) {
      expect(RESERVED).not.toContain(name);
      expect(name).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
      expect(/^(firebase_|google_|ga_)/.test(name)).toBe(false);
    }
    expect(logged).toEqual(expect.arrayContaining(['measure_start', 'measure_end']));
  });
});
