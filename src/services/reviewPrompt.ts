import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import type { SessionSummary } from '../engine';
import { analytics } from './analytics';

const LAST_ASKED_KEY = 'baromok.reviewAskedAt';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Only sessions where the user really measured for a while count. */
export const REVIEW_MIN_SESSION_SEC = 10 * 60;
export const REVIEW_MIN_SESSIONS = 3;
export const REVIEW_MIN_DAYS_SINCE_FIRST = 3;
export const REVIEW_MIN_DAYS_BETWEEN_ASKS = 30;

const measuredSec = (s: SessionSummary) => s.goodSec + s.tiltSec;

/**
 * Whether to ask for an App Store rating right after `ended` finished. iOS still decides whether the
 * prompt actually appears (at most three times a year), so this only keeps us from asking too early
 * or too often: a long session that just ended, a few long sessions behind it, some days of use, and
 * a month since the last ask.
 */
export function shouldAskForReview(
  ended: SessionSummary,
  sessions: SessionSummary[],
  lastAskedAt: number | null,
  now: number,
): boolean {
  if (measuredSec(ended) < REVIEW_MIN_SESSION_SEC) return false;
  if (lastAskedAt !== null && now - lastAskedAt < REVIEW_MIN_DAYS_BETWEEN_ASKS * DAY_MS) return false;
  const long = sessions.filter((s) => measuredSec(s) >= REVIEW_MIN_SESSION_SEC);
  if (long.length < REVIEW_MIN_SESSIONS) return false;
  const first = Math.min(...sessions.map((s) => s.startedAt));
  return now - first >= REVIEW_MIN_DAYS_SINCE_FIRST * DAY_MS;
}

/**
 * The native module only exists in builds from 1.0.3 on (and in Expo Go). Load it lazily so a
 * missing module never breaks ending a session.
 */
function loadStoreReview(): typeof import('expo-store-review') | null {
  try {
    return require('expo-store-review') as typeof import('expo-store-review');
  } catch {
    return null;
  }
}

/** Called after a session is saved, from the stop button. Never throws. */
export async function maybeAskForReview(ended: SessionSummary, sessions: SessionSummary[]): Promise<void> {
  try {
    if (AppState.currentState !== 'active') return;
    const raw = await AsyncStorage.getItem(LAST_ASKED_KEY);
    const lastAskedAt = raw ? Number(raw) : null;
    const now = Date.now();
    if (!shouldAskForReview(ended, sessions, lastAskedAt, now)) return;

    const StoreReview = loadStoreReview();
    if (!StoreReview || !(await StoreReview.isAvailableAsync())) return;
    await AsyncStorage.setItem(LAST_ASKED_KEY, String(now));
    // Let the stop button's state change settle before the sheet appears.
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (AppState.currentState !== 'active') return;
    analytics.reviewPrompt();
    await StoreReview.requestReview();
  } catch {
    // A rating prompt is never worth an error.
  }
}
