import type { Calibration } from '../tilt';
import type { MotionSample } from '../types';
import { type Vector3, cross, normalize, projectOntoPlane, rotateAround, scale, vec } from '../vector';

/**
 * A deliberately "weird" sensor frame so tests don't depend on any assumed AirPods axis layout.
 * `down` is gravity while upright; `forward` is the head's front-back axis.
 */
export const DOWN = normalize(vec(0.3, -0.9, 0.2));
export const FORWARD = normalize(projectOntoPlane(normalize(vec(1, 0.4, -0.5)), DOWN));
export const UP_AXIS = normalize(cross(FORWARD, DOWN)); // left-right axis, for nodding

/** What the Calibrator learns in this frame: gravity rotates positively around it on a right tilt. */
export const CALIBRATION: Calibration = {
  neutralGravity: DOWN,
  forwardAxis: scale(FORWARD, -1),
  sensorLocation: 'default',
  createdAt: 0,
};

/** Gravity after tilting `tiltDeg` (positive = right) and nodding `nodDeg`. */
export function gravityFor(tiltDeg: number, nodDeg = 0): Vector3 {
  // Gravity in the sensor frame rotates opposite to the head.
  return rotateAround(rotateAround(DOWN, FORWARD, -tiltDeg), UP_AXIS, -nodDeg);
}

export function sample(t: number, tiltDeg: number, extra: Partial<MotionSample> = {}): MotionSample {
  return {
    timestamp: t,
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    gravity: gravityFor(tiltDeg),
    rotationRate: vec(0, 0, 0),
    userAcceleration: vec(0, 0, 0),
    sensorLocation: 'default',
    ...extra,
  };
}

/** Samples at `hz` from t0 for `durationSec`, tilt given by `tiltAt(t)`. */
export function stream(
  t0: number,
  durationSec: number,
  tiltAt: (t: number) => number,
  hz = 25,
  nodAt: (t: number) => number = () => 0,
): MotionSample[] {
  const out: MotionSample[] = [];
  for (let i = 0; i < Math.round(durationSec * hz); i++) {
    const t = t0 + i / hz;
    out.push(sample(t, tiltAt(t), { gravity: gravityFor(tiltAt(t), nodAt(t)) }));
  }
  return out;
}
