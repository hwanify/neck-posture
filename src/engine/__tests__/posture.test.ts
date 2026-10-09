import { describe, expect, it } from '@jest/globals';

import { PostureEngine } from '../postureEngine';
import { PostureStateMachine } from '../postureStateMachine';
import { SessionStats } from '../sessionStats';
import { DEFAULT_POSTURE_SETTINGS, type PostureEvent } from '../types';
import { CALIBRATION as calibration, sample, stream } from './helpers';
const settings = DEFAULT_POSTURE_SETTINGS; // enter 10, exit 7, hold 5s, cooldown 30s

function run(engine: PostureEngine, samples: ReturnType<typeof stream>) {
  const events: PostureEvent[] = [];
  let last;
  for (const s of samples) {
    last = engine.process(s);
    events.push(...last.events);
  }
  return { events, last: last! };
}

describe('PostureStateMachine', () => {
  it('alerts only after the tilt is held for holdSec', () => {
    const m = new PostureStateMachine(settings);
    expect(m.update(0, 12, false)).toEqual([]);
    expect(m.state).toBe('tilting');
    expect(m.update(4.9, 12, false)).toEqual([]);
    expect(m.update(5, -12, false)).toEqual([{ type: 'alert', at: 5, direction: 'left', angle: -12, repeat: 0 }]);
    expect(m.state).toBe('alerted');
  });

  it('uses hysteresis between enter and exit thresholds', () => {
    const m = new PostureStateMachine(settings);
    m.update(0, 11, false);
    m.update(1, 8, false); // below enter but above exit: still tilting
    expect(m.state).toBe('tilting');
    m.update(2, 6, false);
    expect(m.state).toBe('good');
  });

  it('repeats alerts at a fixed interval while still tilted and resets on recovery', () => {
    const m = new PostureStateMachine(settings);
    const alerts: number[] = [];
    for (let t = 0; t <= 200; t += 0.5) {
      for (const e of m.update(t, 15, false)) if (e.type === 'alert') alerts.push(e.at);
    }
    expect(alerts).toEqual([5, 35, 65, 95, 125, 155, 185]);
    expect(m.update(201, 0, false)).toEqual([{ type: 'recovered', at: 201, afterAlert: true }]);
  });

  it('with a 0-second interval repeats right after each cue', () => {
    const m = new PostureStateMachine({ ...settings, cooldownSec: 0 });
    const alerts: number[] = [];
    for (let t = 0; t <= 7; t += 0.1) {
      for (const e of m.update(Math.round(t * 10) / 10, 15, false)) if (e.type === 'alert') alerts.push(e.at);
    }
    expect(alerts).toEqual([5, 5.5, 6, 6.5, 7]);
  });

  it('pausing resets the tilt timer', () => {
    const m = new PostureStateMachine(settings);
    m.update(0, 12, false);
    m.update(3, 12, true);
    expect(m.state).toBe('paused');
    m.update(4, 12, false); // resumes as good → tilting starts at 4
    expect(m.update(8.5, 12, false)).toEqual([]);
    expect(m.update(9, 12, false)[0]?.type).toBe('alert');
  });
});

describe('PostureEngine', () => {
  it('alerts once for a sustained right tilt and recovers', () => {
    const engine = new PostureEngine(calibration, settings);
    const samples = [...stream(0, 2, () => 0), ...stream(2, 7, () => 14), ...stream(9, 2, () => 0)];
    const { events, last } = run(engine, samples);
    expect(events.filter((e) => e.type === 'alert')).toHaveLength(1);
    expect(events.find((e) => e.type === 'alert')).toMatchObject({ direction: 'right' });
    expect(events[events.length - 1]).toMatchObject({ type: 'recovered', afterAlert: true });
    expect(last.state).toBe('good');
  });

  it('does not alert for short glances to the side', () => {
    const engine = new PostureEngine(calibration, settings);
    const samples = stream(0, 30, (t) => (Math.floor(t) % 6 < 3 ? 15 : 0));
    expect(run(engine, samples).events.filter((e) => e.type === 'alert')).toHaveLength(0);
  });

  it('pauses while the head moves fast or the user walks', () => {
    const engine = new PostureEngine(calibration, { ...settings, measureWhileWalking: false });
    expect(engine.process(sample(0, 20, { rotationRate: { x: 0, y: 2, z: 0 } })).pauseReason).toBe('moving');
    expect(engine.process(sample(0.5, 20)).pauseReason).toBe('moving');
    expect(engine.process(sample(1, 0)).pauseReason).toBeNull();

    let snap;
    for (let t = 2; t < 6; t += 0.04) {
      snap = engine.process(sample(t, 0, { userAcceleration: { x: 0.3, y: 0, z: 0 } }));
    }
    expect(snap!.pauseReason).toBe('walking');
  });

  it('keeps measuring while walking by default', () => {
    const engine = new PostureEngine(calibration, settings);
    let snap;
    for (let t = 0; t < 4; t += 0.04) {
      snap = engine.process(sample(t, 0, { userAcceleration: { x: 0.3, y: 0, z: 0 } }));
    }
    expect(snap!.pauseReason).toBeNull();
  });

  it('stays paused without calibration', () => {
    const engine = new PostureEngine(null, settings);
    const { events, last } = run(
      engine,
      stream(0, 10, () => 30),
    );
    expect(events).toHaveLength(0);
    expect(last.pauseReason).toBe('notCalibrated');
  });
});

describe('SessionStats', () => {
  it('averages the signed angle so a left lean reads negative', () => {
    const stats = new SessionStats('s0', 0);
    for (let t = 0; t <= 10; t += 0.5) stats.add(t, t < 5 ? -6 : -2, 'good', []);
    expect(stats.summary(10).avgAngle).toBeCloseTo(-4, 0);
    expect(stats.summary(10).avgAbsAngle).toBeCloseTo(4, 0);
  });

  it('accumulates good/tilt time, left/right bias and timeline', () => {
    const engine = new PostureEngine(calibration, settings);
    const stats = new SessionStats('s1', 0);
    const samples = [...stream(0, 10, () => 0), ...stream(10, 10, () => -15), ...stream(20, 10, () => 0)];
    for (const s of samples) {
      const snap = engine.process(s);
      stats.add(snap.t, snap.angle, snap.state, snap.events);
    }
    const summary = stats.summary(30_000);
    expect(summary.alertCount).toBe(1);
    expect(summary.goodSec).toBeGreaterThan(18);
    expect(summary.tiltSec).toBeGreaterThan(9);
    expect(summary.leftTiltSec).toBeCloseTo(summary.tiltSec, 0);
    expect(summary.rightTiltSec).toBe(0);
    expect(summary.timeline).toHaveLength(6);
    expect(summary.timeline[2]).toBeLessThan(-14);
  });
});
