import { describe, expect, it, jest } from '@jest/globals';

import type { SessionSummary } from '../../engine';
import { shouldAskForReview } from '../reviewPrompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;

const session = (daysAgo: number, minutes: number): SessionSummary => ({
  id: `${daysAgo}-${minutes}`,
  startedAt: NOW - daysAgo * DAY,
  endedAt: NOW - daysAgo * DAY + minutes * 60_000,
  goodSec: minutes * 45,
  tiltSec: minutes * 15,
  pausedSec: 0,
  leftTiltSec: 0,
  rightTiltSec: 0,
  alertCount: 0,
  avgAbsAngle: 0,
  timeline: [],
});

describe('shouldAskForReview', () => {
  const regular = [session(5, 20), session(3, 15), session(0, 12)];
  const ASKED = NOW - 40 * DAY;

  it('asks the first time after a session of a minute or more', () => {
    const first = session(0, 1);
    expect(shouldAskForReview(first, [first], null, NOW)).toBe(true);
  });

  it('does not ask the first time after a quick try', () => {
    const quick = session(0, 0.5);
    expect(shouldAskForReview(quick, [quick], null, NOW)).toBe(false);
  });

  it('asks again after a long session once the user has a few long sessions over some days', () => {
    expect(shouldAskForReview(regular[2], regular, ASKED, NOW)).toBe(true);
  });

  it('does not ask again after a short session', () => {
    const ended = session(0, 5);
    expect(shouldAskForReview(ended, [...regular, ended], ASKED, NOW)).toBe(false);
  });

  it('waits for three long sessions before asking again', () => {
    const sessions = [session(5, 20), session(4, 3), session(0, 12)];
    expect(shouldAskForReview(sessions[2], sessions, ASKED, NOW)).toBe(false);
  });

  it('waits until the first session is three days old before asking again', () => {
    const sessions = [session(2, 20), session(1, 15), session(0, 12)];
    expect(shouldAskForReview(sessions[2], sessions, ASKED, NOW)).toBe(false);
  });

  it('asks at most once a month', () => {
    expect(shouldAskForReview(regular[2], regular, NOW - 10 * DAY, NOW)).toBe(false);
    expect(shouldAskForReview(regular[2], regular, NOW - 31 * DAY, NOW)).toBe(true);
  });
});
