/**
 * Anonymous usage events through Firebase Analytics (no advertising ID, no ad signals; see
 * firebase.json). Only coarse buckets are sent: never angles, timelines or anything typed by the user.
 *
 * The native module is missing in Expo Go and in builds made before 1.0.5, so it is loaded lazily and
 * every call is a no-op when it can't be.
 */
type AnalyticsApi = {
  log: (name: string, params?: Record<string, string | number>) => void;
  setEnabled: (enabled: boolean) => void;
};

let api: AnalyticsApi | null | undefined;

function load(): AnalyticsApi | null {
  if (api !== undefined) return api;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@react-native-firebase/analytics') as typeof import('@react-native-firebase/analytics');
    const analytics = mod.getAnalytics();
    api = {
      log: (name, params) => void Promise.resolve(mod.logEvent(analytics, name, params)).catch(() => {}),
      setEnabled: (enabled) =>
        void Promise.resolve(mod.setAnalyticsCollectionEnabled(analytics, enabled)).catch(() => {}),
    };
  } catch {
    api = null;
  }
  return api;
}

let enabled = true;

/** Follows the "Share usage statistics" setting; turning it off also stops Firebase collecting. */
export function setAnalyticsEnabled(on: boolean): void {
  enabled = on;
  load()?.setEnabled(on);
}

function track(name: string, params?: Record<string, string | number>): void {
  if (!enabled) return;
  try {
    load()?.log(name, params);
  } catch {
    // Analytics is never worth an error.
  }
}

/** Upper edges in minutes for the session-length buckets. */
const MINUTE_BUCKETS = [5, 15, 30, 60];

export function minutesBucket(sec: number): string {
  const min = sec / 60;
  let lower = 0;
  for (const upper of MINUTE_BUCKETS) {
    if (min < upper) return `${lower}-${upper}m`;
    lower = upper;
  }
  return `${lower}m+`;
}

/** 0–100 in steps of 20, e.g. "60-80". */
export function percentBucket(ratio: number): string {
  const step = Math.min(4, Math.floor(Math.max(0, Math.min(1, ratio)) * 5));
  return `${step * 20}-${step * 20 + 20}`;
}

export const analytics = {
  onboardingComplete: () => track('onboarding_complete'),
  calibrationComplete: (first: boolean) => track('calibration_complete', { first: first ? 1 : 0 }),
  sessionStart: (source: string) => track('session_start', { source }),
  sessionEnd: (s: { judgedSec: number; goodRatio: number; alerts: number; source: string }) =>
    track('session_end', {
      minutes: minutesBucket(s.judgedSec),
      good_pct: percentBucket(s.goodRatio),
      alerts: Math.min(s.alerts, 100),
      source: s.source,
    }),
  settingsChange: (setting: string) => track('settings_change', { setting }),
  reviewPrompt: () => track('review_prompt'),
  contactTap: () => track('contact_tap'),
};
