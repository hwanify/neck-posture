import { describe, expect, it } from '@jest/globals';

import { habitReport } from '../habitReport';
import { SessionStats, type SessionSummary } from '../sessionStats';

const summary = (timeline: (number | null)[], patch: Partial<SessionSummary> = {}): SessionSummary => ({
  id: 'x',
  startedAt: 0,
  endedAt: timeline.length * 5000,
  goodSec: 0,
  tiltSec: 0,
  pausedSec: 0,
  leftTiltSec: 0,
  rightTiltSec: 0,
  alertCount: 0,
  avgAbsAngle: 0,
  timeline,
  ...patch,
});

const hist = (secByDeg: Record<number, number>) => {
  const h = Array<number>(41).fill(0);
  for (const [deg, sec] of Object.entries(secByDeg)) h[Number(deg) + 20] = sec;
  return h;
};

describe('habitReport', () => {
  it('splits measured time into left, upright and right', () => {
    const r = habitReport(summary([], { goodSec: 600, tiltSec: 400, rightTiltSec: 300, leftTiltSec: 100 }), 5);
    expect(r.measuredSec).toBe(1000);
    expect(r.leftShare).toBeCloseTo(0.1);
    expect(r.goodShare).toBeCloseTo(0.6);
    expect(r.rightShare).toBeCloseTo(0.3);
  });

  it('takes the usual angle from all measured time, not only the tilted part', () => {
    // Mostly a little right, one long-ish stretch far left.
    const r = habitReport(summary([], { angleHist: hist({ 1: 60, 2: 90, 3: 70, [-6]: 15, 8: 3 }) }), 5);
    expect(r.usualAngle).toBe(2);
    expect(habitReport(summary([], { angleHist: hist({}) }), 5).usualAngle).toBeNull();
  });

  it('uses the recorded tilt count and longest tilt', () => {
    const r = habitReport(summary([], { tiltEpisodes: 4, longestTiltSec: 12.5 }), 5);
    expect(r.episodes).toBe(4);
    expect(r.longestTiltSec).toBe(12.5);
  });

  it('falls back to the timeline for older sessions', () => {
    const r = habitReport(summary([0, 6, 6, 0, 7, null, 8, 8, 8, -1, -1]), 5);
    expect(r.episodes).toBe(3);
    expect(r.longestTiltSec).toBe(15);
    expect(r.usualAngle).toBe(8);
  });
});

describe('habitReport halves', () => {
  it('compares the usual angle early and late in the session', () => {
    const r = habitReport(summary([...Array(20).fill(1), ...Array(20).fill(4)]), 5);
    expect(r.halves).toEqual({ first: 1, second: 4 });
  });

  it('skips the comparison for short sessions', () => {
    expect(habitReport(summary([1, 1, 4, 4]), 5).halves).toBeNull();
  });
});

describe('SessionStats tilt runs', () => {
  it('counts each upright → tilted change and the longest run', () => {
    const stats = new SessionStats('x', 0);
    const states = ['good', 'tilting', 'alerted', 'alerted', 'good', 'tilting', 'good'] as const;
    states.forEach((state, i) => stats.add(i * 0.5, state === 'good' ? 1 : 7, state, []));
    const s = stats.summary(10_000);
    expect(s.tiltEpisodes).toBe(2);
    expect(s.longestTiltSec).toBeCloseTo(1.5);
    expect(s.angleHist?.[21]).toBeCloseTo(1);
    expect(s.angleHist?.[27]).toBeCloseTo(2);
  });
});
