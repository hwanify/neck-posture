import type { Calibration } from './tilt';
import type { MotionSample } from './types';
import { type Vector3, add, angleBetweenDeg, cross, length, normalize, vec } from './vector';

export type CalibratorPhase = 'neutral' | 'tiltRight' | 'done';

export type CalibratorStatus = {
  phase: CalibratorPhase;
  /** 0...1 progress within the current phase. */
  progress: number;
  /** User is moving too much during the neutral phase. */
  tooMuchMotion: boolean;
  /** Current angle away from neutral during the tilt phase (deg, unsigned). */
  tiltDeg: number;
  result?: Calibration;
};

export type CalibratorOptions = {
  neutralSec: number;
  maxRotationRate: number;
  minTiltDeg: number;
  tiltHoldSec: number;
};

const DEFAULTS: CalibratorOptions = {
  neutralSec: 3,
  maxRotationRate: 0.5,
  minTiltDeg: 12,
  tiltHoldSec: 0.6,
};

/**
 * Two-step calibration fed with live samples:
 * 1. sit straight and still → average gravity becomes the neutral reference
 * 2. tilt the head to the right → the rotation from neutral defines the lateral-tilt axis and its sign
 */
export class Calibrator {
  private readonly options: CalibratorOptions;
  private phase: CalibratorPhase = 'neutral';
  private gravitySum: Vector3 = vec(0, 0, 0);
  private phaseStart: number | null = null;
  private neutral: Vector3 | null = null;
  private tiltSum: Vector3 = vec(0, 0, 0);
  private tiltStart: number | null = null;
  private result: Calibration | undefined;

  constructor(options: Partial<CalibratorOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  feed(sample: MotionSample): CalibratorStatus {
    const t = sample.timestamp;
    const g = normalize(sample.gravity);

    if (this.phase === 'neutral') {
      const moving = length(sample.rotationRate) > this.options.maxRotationRate;
      if (moving || this.phaseStart === null) {
        this.gravitySum = vec(0, 0, 0);
        this.phaseStart = moving ? null : t;
        if (moving) return this.status(0, true, 0);
      }
      this.gravitySum = add(this.gravitySum, g);
      const progress = Math.min(1, (t - this.phaseStart!) / this.options.neutralSec);
      if (progress >= 1) {
        this.neutral = normalize(this.gravitySum);
        this.phase = 'tiltRight';
        return this.status(0, false, 0);
      }
      return this.status(progress, false, 0);
    }

    if (this.phase === 'tiltRight' && this.neutral) {
      const tiltDeg = angleBetweenDeg(this.neutral, g);
      if (tiltDeg < this.options.minTiltDeg) {
        this.tiltStart = null;
        this.tiltSum = vec(0, 0, 0);
        return this.status(Math.min(0.99, tiltDeg / this.options.minTiltDeg) * 0.5, false, tiltDeg);
      }
      if (this.tiltStart === null) this.tiltStart = t;
      this.tiltSum = add(this.tiltSum, g);
      const held = (t - this.tiltStart) / this.options.tiltHoldSec;
      if (held >= 1) {
        const tilted = normalize(this.tiltSum);
        this.result = {
          neutralGravity: this.neutral,
          forwardAxis: normalize(cross(this.neutral, tilted)),
          sensorLocation: sample.sensorLocation,
          createdAt: Date.now(),
        };
        this.phase = 'done';
        return this.status(1, false, tiltDeg);
      }
      return this.status(0.5 + Math.min(held, 1) * 0.5, false, tiltDeg);
    }

    return this.status(1, false, 0);
  }

  private status(progress: number, tooMuchMotion: boolean, tiltDeg: number): CalibratorStatus {
    return { phase: this.phase, progress, tooMuchMotion, tiltDeg, result: this.result };
  }
}

/** Synthetic helper for tests and demo mode: gravity for a head tilted `deg` to the right. */
export function demoGravity(deg: number): Vector3 {
  // Arbitrary sensor frame: gravity along -z when upright, tilt rotates it towards +x.
  const r = (deg * Math.PI) / 180;
  return vec(Math.sin(r), 0, -Math.cos(r));
}
