import { describe, expect, it } from '@jest/globals';

import { habitReport } from '../habitReport';
import type { SessionSummary } from '../sessionStats';

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

describe('habitReport', () => {
  it('reports the tilted share and the preferred side', () => {
    const r = habitReport(summary([], { goodSec: 600, tiltSec: 400, rightTiltSec: 300, leftTiltSec: 100 }), 5);
    expect(r.measuredSec).toBe(1000);
    expect(r.tiltShare).toBeCloseTo(0.4);
    expect(r.side).toBe('right');
    expect(r.sideShare).toBeCloseTo(0.75);
  });

  it('has no side when there was no tilt', () => {
    const r = habitReport(summary([], { goodSec: 600 }), 5);
    expect(r.side).toBeNull();
    expect(r.sideShare).toBe(0);
  });

  it('finds the longest tilted run, ignoring paused buckets as breaks', () => {
    const r = habitReport(summary([1, 6, 7, 8, null, 9, 9, 2, -7, -8]), 5);
    expect(r.longestTiltSec).toBe(15);
  });

  it('finds when tilting started and that it grew later on', () => {
    const calm = Array(24).fill(1);
    const tilted = Array(24).fill(9);
    const r = habitReport(summary([...calm, ...tilted]), 5);
    expect(r.firstTiltAfterSec).toBeGreaterThanOrEqual(60);
    expect(r.firstTiltAfterSec).toBeLessThanOrEqual(120);
    expect(r.trend).toBe('later');
  });

  it('calls a short or even session steady', () => {
    expect(habitReport(summary([9, 9, 9]), 5).trend).toBe('steady');
    expect(habitReport(summary(Array(40).fill(6)), 5).trend).toBe('steady');
    expect(habitReport(summary(Array(40).fill(1)), 5).firstTiltAfterSec).toBeNull();
  });

  it('finds the usual tilt angle with its side', () => {
    const r = habitReport(summary([1, 7, 7.2, 6.8, 7, 12, 1, -6, 0, 8, 7]), 5);
    expect(r.typicalAngle).toBe(7);
    expect(habitReport(summary([-9, -9.4, -8.6, 6, 0]), 5).typicalAngle).toBe(-9);
    expect(habitReport(summary([1, 2, -1]), 5).typicalAngle).toBeNull();
  });

  it('counts tilts and their mean length', () => {
    const r = habitReport(summary([0, 6, 6, 0, 7, null, 8, 8, 8, 0]), 5);
    expect(r.episodes).toBe(3);
    expect(r.avgEpisodeSec).toBeCloseTo((6 * 5) / 3);
  });

  it('bins the distribution and clamps the ends', () => {
    const r = habitReport(summary([0, 0, 30, -25, null]), 5);
    expect(r.histogram).toHaveLength(41);
    expect(r.histogram[20]).toBe(2);
    expect(r.histogram[40]).toBe(1);
    expect(r.histogram[0]).toBe(1);
  });
});
