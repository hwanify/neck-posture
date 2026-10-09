import { describe, expect, it } from '@jest/globals';

import { Calibrator } from '../calibrator';
import { flipCalibration, lateralTiltDeg } from '../tilt';
import { CALIBRATION as calibration, gravityFor, sample, stream } from './helpers';

describe('lateralTiltDeg', () => {
  it('measures signed tilt relative to neutral', () => {
    expect(lateralTiltDeg(gravityFor(0), calibration)).toBeCloseTo(0, 5);
    expect(lateralTiltDeg(gravityFor(12), calibration)).toBeCloseTo(12, 5);
    expect(lateralTiltDeg(gravityFor(-20), calibration)).toBeCloseTo(-20, 5);
  });

  it('ignores nodding forward/back', () => {
    expect(lateralTiltDeg(gravityFor(0, 25), calibration)).toBeCloseTo(0, 5);
    expect(lateralTiltDeg(gravityFor(10, -15), calibration)).toBeCloseTo(10, 0);
  });

  it('flips sign when calibration is flipped', () => {
    expect(lateralTiltDeg(gravityFor(8), flipCalibration(calibration))).toBeCloseTo(-8, 5);
  });
});

describe('Calibrator', () => {
  type Pose = [tiltDeg: number, nodDeg: number];
  const hold = (t0: number, [tilt, nod]: Pose) =>
    stream(
      t0,
      1.3,
      () => tilt,
      25,
      () => nod,
    );

  /** Neutral, then hold each pose of left / right / forward / back in turn. */
  function calibrate(left: Pose = [-20, 0], right: Pose = [20, 0], forward: Pose = [0, 20], back: Pose = [0, -20]) {
    const calibrator = new Calibrator();
    let status = calibrator.feed(sample(0, 0));
    for (const s of stream(0.04, 3.2, () => 0)) status = calibrator.feed(s);
    const phases = ['tiltLeft', 'tiltRight', 'nodForward', 'nodBack'] as const;
    [left, right, forward, back].forEach((pose, i) => {
      expect(status.phase).toBe(phases[i]);
      for (const s of hold(3.3 + i * 1.5, pose)) status = calibrator.feed(s);
    });
    expect(status.phase).toBe('done');
    return status.result!;
  }

  it('learns neutral and axes from left, right, forward and back', () => {
    const result = calibrate();
    expect(lateralTiltDeg(gravityFor(15), result)).toBeCloseTo(15, 3);
    expect(lateralTiltDeg(gravityFor(-9), result)).toBeCloseTo(-9, 3);
    expect(lateralTiltDeg(gravityFor(0, 25), result)).toBeCloseTo(0, 3);
    expect(lateralTiltDeg(gravityFor(0, -25), result)).toBeCloseTo(0, 3);
  });

  it('cancels nodding mixed into the left/right poses', () => {
    const result = calibrate([-20, 8], [20, 8]);
    expect(lateralTiltDeg(gravityFor(0, 30), result)).toBeCloseTo(0, 1);
    expect(lateralTiltDeg(gravityFor(0, -30), result)).toBeCloseTo(0, 1);
    expect(lateralTiltDeg(gravityFor(15), result)).toBeCloseTo(15, 1);
  });

  it('corrects a neck whose nod drifts sideways differently forward and back', () => {
    // Nodding forward drifts 3° right, nodding back drifts 2° right.
    const result = calibrate([-20, 0], [20, 0], [3, 20], [2, -20]);
    expect(Math.abs(lateralTiltDeg(gravityFor(3, 20), result))).toBeLessThan(0.3);
    expect(Math.abs(lateralTiltDeg(gravityFor(2, -20), result))).toBeLessThan(0.3);
    expect(Math.abs(lateralTiltDeg(gravityFor(4.5, 30), result))).toBeLessThan(0.8);
    expect(lateralTiltDeg(gravityFor(15), result)).toBeCloseTo(15, 0);
  });

  it('keeps left/right correct after flipping', () => {
    const result = flipCalibration(calibrate([-20, 0], [20, 0], [3, 20], [2, -20]));
    expect(lateralTiltDeg(gravityFor(15), result)).toBeCloseTo(-15, 0);
    expect(Math.abs(lateralTiltDeg(gravityFor(3, 20), result))).toBeLessThan(0.3);
  });

  it('asks for the other side when tilting left again in the right step', () => {
    const calibrator = new Calibrator();
    for (const s of stream(0, 3.3, () => 0)) calibrator.feed(s);
    for (const s of hold(3.3, [-20, 0])) calibrator.feed(s);
    let status = calibrator.feed(sample(4.7, -20));
    expect(status.phase).toBe('tiltRight');
    for (const s of hold(4.8, [-20, 0])) status = calibrator.feed(s);
    expect(status.phase).toBe('tiltRight');
    expect(status.hint).toBe('wrongSide');
  });

  it('does not accept a nod while the head is still tilted sideways', () => {
    const calibrator = new Calibrator();
    for (const s of stream(0, 3.3, () => 0)) calibrator.feed(s);
    for (const s of hold(3.3, [-20, 0])) calibrator.feed(s);
    let status = calibrator.feed(sample(4.7, 0));
    for (const s of hold(4.8, [20, 0])) status = calibrator.feed(s);
    expect(status.phase).toBe('nodForward');
    for (const s of hold(6.2, [15, 20])) status = calibrator.feed(s);
    expect(status.phase).toBe('nodForward');
    expect(status.hint).toBe('stillSideways');
  });

  it('restarts the neutral phase when the head moves', () => {
    const calibrator = new Calibrator();
    for (const s of stream(0, 2, () => 0)) calibrator.feed(s);
    const moving = calibrator.feed(sample(2.04, 0, { rotationRate: { x: 2, y: 0, z: 0 } }));
    expect(moving.tooMuchMotion).toBe(true);
    expect(moving.progress).toBe(0);
    let status = moving;
    for (const s of stream(2.1, 2, () => 0)) status = calibrator.feed(s);
    expect(status.phase).toBe('neutral');
  });
});
