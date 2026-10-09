import { describe, expect, it } from '@jest/globals';

import { PostureCheck } from '../postureCheck';
import { lateralTiltDeg } from '../tilt';
import { type Vector3, rotateAround } from '../vector';
import { CALIBRATION, DOWN, FORWARD, UP_AXIS, gravityFor, sample, stream } from './helpers';

/** The earbud sits differently in the ear: every sensor-frame vector turns by the same rotation. */
const reseat = (axis: Vector3) => (g: Vector3) => rotateAround(g, axis, 9);

describe('PostureCheck', () => {
  it('re-zeroes after the AirPods are re-seated', () => {
    for (const axis of [FORWARD, UP_AXIS]) {
      const seat = reseat(axis);
      const check = new PostureCheck(CALIBRATION);
      let status = check.feed(sample(0, 0, { gravity: seat(DOWN) }));
      for (const s of stream(0.04, 5.1, () => 0)) status = check.feed({ ...s, gravity: seat(s.gravity) });
      expect(status.progress).toBe(1);
      const { calibration, shiftDeg } = status.result!;
      expect(shiftDeg).toBeCloseTo(9, 3);
      expect(lateralTiltDeg(seat(gravityFor(0)), calibration)).toBeCloseTo(0, 3);
      expect(lateralTiltDeg(seat(gravityFor(15)), calibration)).toBeCloseTo(15, 3);
      expect(lateralTiltDeg(seat(gravityFor(0, 25)), calibration)).toBeCloseTo(0, 3);
    }
  });

  it('restarts the still period when the head moves and never times out', () => {
    const check = new PostureCheck(CALIBRATION);
    for (const s of stream(0, 4, () => 0)) check.feed(s);
    const moved = check.feed(sample(4.04, 0, { rotationRate: { x: 2, y: 0, z: 0 } }));
    expect(moved).toMatchObject({ progress: 0, tooMuchMotion: true });
    let status = moved;
    for (const s of stream(4.1, 4.9, () => 0)) status = check.feed(s);
    expect(status.result).toBeUndefined();
    for (const s of stream(9.0, 0.3, () => 0)) status = check.feed(s);
    expect(status.result?.shiftDeg).toBeCloseTo(0, 3);
  });

  it('restarts when samples stop arriving for a moment', () => {
    const check = new PostureCheck(CALIBRATION);
    for (const s of stream(0, 3, () => 0)) check.feed(s);
    let status = check.feed(sample(10, 0));
    expect(status.progress).toBe(0);
    for (const s of stream(10.04, 4.5, () => 0)) status = check.feed(s);
    expect(status.result).toBeUndefined();
  });
});
