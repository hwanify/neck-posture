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
  it('learns neutral and tilt axis from sitting still then tilting right', () => {
    const calibrator = new Calibrator();
    let status = calibrator.feed(sample(0, 0));
    for (const s of stream(0.04, 3.2, () => 0)) status = calibrator.feed(s);
    expect(status.phase).toBe('tiltRight');

    for (const s of stream(3.3, 0.5, (t) => (t - 3.3) * 40)) status = calibrator.feed(s);
    for (const s of stream(3.8, 1, () => 20)) status = calibrator.feed(s);
    expect(status.phase).toBe('done');

    const result = status.result!;
    expect(lateralTiltDeg(gravityFor(15), result)).toBeCloseTo(15, 3);
    expect(lateralTiltDeg(gravityFor(-9), result)).toBeCloseTo(-9, 3);
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
