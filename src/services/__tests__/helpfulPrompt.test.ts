import { describe, expect, it, jest } from '@jest/globals';

import type { SessionSummary } from '../../engine';
import { shouldAskHelpful } from '../helpfulPrompt';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../analytics', () => ({ track: jest.fn() }));
jest.mock('../../i18n', () => ({ t: (k: string) => k }));

const session = (minutes: number): SessionSummary => ({
  id: `${minutes}-${Math.random()}`,
  startedAt: 0,
  endedAt: minutes * 60_000,
  goodSec: minutes * 45,
  tiltSec: minutes * 15,
  pausedSec: 0,
  leftTiltSec: 0,
  rightTiltSec: 0,
  alertCount: 0,
  avgAbsAngle: 0,
  timeline: [],
});

describe('shouldAskHelpful', () => {
  it('asks after the second long session', () => {
    const sessions = [session(20), session(12)];
    expect(shouldAskHelpful(sessions[1], sessions, false)).toBe(true);
  });

  it('waits for two long sessions', () => {
    const sessions = [session(3), session(12)];
    expect(shouldAskHelpful(sessions[1], sessions, false)).toBe(false);
  });

  it('does not ask after a short session or a second time', () => {
    const sessions = [session(20), session(12), session(4)];
    expect(shouldAskHelpful(sessions[2], sessions, false)).toBe(false);
    expect(shouldAskHelpful(sessions[1], sessions, true)).toBe(false);
  });
});
