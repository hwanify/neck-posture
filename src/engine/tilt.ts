import type { SensorLocation } from './types';
import { RAD_TO_DEG, type Vector3, cross, dot, normalize, projectOntoPlane, scale } from './vector';

/**
 * Personal reference captured during calibration.
 *
 * Tilt is measured from the gravity vector (drift-free, unaffected by turning the head left/right)
 * as a signed rotation around the head's front-back axis. That axis is not assumed from the AirPods
 * coordinate system — it's measured by asking the user to tilt to the right once, which also fixes
 * the sign regardless of which earbud's sensor is used or how the earbuds sit in the ear.
 */
export type Calibration = {
  /** Unit gravity vector (sensor frame) while sitting straight. */
  neutralGravity: Vector3;
  /** Unit axis; a positive rotation around it is a tilt to the user's right. */
  forwardAxis: Vector3;
  sensorLocation: SensorLocation;
  createdAt: number;
};

/** Signed lateral tilt in degrees relative to the calibrated posture: negative = left, positive = right. */
export function lateralTiltDeg(gravity: Vector3, calibration: Calibration): number {
  const axis = calibration.forwardAxis;
  const reference = normalize(projectOntoPlane(calibration.neutralGravity, axis));
  const current = normalize(projectOntoPlane(gravity, axis));
  return Math.atan2(dot(axis, cross(reference, current)), dot(reference, current)) * RAD_TO_DEG;
}

/** Same calibration with left/right swapped, for when the user tilted the wrong way while calibrating. */
export function flipCalibration(calibration: Calibration): Calibration {
  return { ...calibration, forwardAxis: scale(calibration.forwardAxis, -1) };
}
