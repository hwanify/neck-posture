import type { Calibration } from './tilt';
import type { MotionSample } from './types';
import {
  type Vector3,
  RAD_TO_DEG,
  add,
  angleBetweenDeg,
  cross,
  dot,
  length,
  normalize,
  projectOntoPlane,
  scale,
  sub,
  vec,
} from './vector';

export type CalibratorPhase = 'neutral' | 'tiltRight' | 'nodForward' | 'done';

export type CalibratorStatus = {
  phase: CalibratorPhase;
  /** 0...1 progress within the current phase. */
  progress: number;
  /** User is moving too much during the neutral phase. */
  tooMuchMotion: boolean;
  /** Current angle away from neutral in the active direction (deg, unsigned). */
  tiltDeg: number;
  /** Nod phase: the head is still tilted sideways; straighten it before nodding. */
  stillSideways: boolean;
  result?: Calibration;
};

export type CalibratorOptions = {
  neutralSec: number;
  maxRotationRate: number;
  minTiltDeg: number;
  tiltHoldSec: number;
  /** Max sideways tilt (deg) still accepted while nodding. */
  maxSidewaysDuringNodDeg: number;
};

const DEFAULTS: CalibratorOptions = {
  neutralSec: 3,
  maxRotationRate: 0.5,
  minTiltDeg: 12,
  tiltHoldSec: 0.6,
  maxSidewaysDuringNodDeg: 8,
};

const asinDeg = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) * RAD_TO_DEG;

/**
 * Three-step calibration fed with live samples:
 * 1. sit straight and still → average gravity is the neutral reference
 * 2. tilt the head to the right → the direction gravity moves defines left/right and its sign
 * 3. nod forward → the direction gravity moves defines front/back
 * Step 3 lets the side-tilt axis be made exactly perpendicular to nodding, so looking down or up
 * no longer reads as a sideways tilt even when step 2 mixed in some nodding.
 */
export class Calibrator {
  private readonly options: CalibratorOptions;
  private phase: CalibratorPhase = 'neutral';
  private gravitySum: Vector3 = vec(0, 0, 0);
  private phaseStart: number | null = null;
  private neutral: Vector3 | null = null;
  /** Unit direction gravity moves (in the plane ⟂ neutral) when tilting right. */
  private sideDir: Vector3 | null = null;
  private holdSum: Vector3 = vec(0, 0, 0);
  private holdStart: number | null = null;
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

    const neutral = this.neutral!;

    if (this.phase === 'tiltRight') {
      const tiltDeg = angleBetweenDeg(neutral, g);
      const held = this.hold(t, g, tiltDeg >= this.options.minTiltDeg);
      if (held >= 1) {
        this.sideDir = normalize(projectOntoPlane(normalize(this.holdSum), neutral));
        this.resetHold();
        this.phase = 'nodForward';
        return this.status(0, false, 0);
      }
      return this.status(this.holdProgress(tiltDeg, held), false, tiltDeg);
    }

    if (this.phase === 'nodForward') {
      const side = this.sideDir!;
      const offset = projectOntoPlane(g, neutral);
      const sidewaysDeg = Math.abs(asinDeg(dot(offset, side)));
      const nodDeg = asinDeg(length(sub(offset, scale(side, dot(offset, side)))));
      const stillSideways = sidewaysDeg > this.options.maxSidewaysDuringNodDeg;
      const held = this.hold(t, g, !stillSideways && nodDeg >= this.options.minTiltDeg);
      if (held >= 1) {
        this.finish(normalize(this.holdSum), sample);
        return this.status(1, false, nodDeg);
      }
      return this.status(this.holdProgress(nodDeg, held), false, nodDeg, stillSideways);
    }

    return this.status(1, false, 0);
  }

  /** Accumulate samples while `inPose` holds; returns hold progress (≥1 when complete). */
  private hold(t: number, g: Vector3, inPose: boolean): number {
    if (!inPose) {
      this.resetHold();
      return 0;
    }
    if (this.holdStart === null) this.holdStart = t;
    this.holdSum = add(this.holdSum, g);
    return (t - this.holdStart) / this.options.tiltHoldSec;
  }

  private resetHold() {
    this.holdStart = null;
    this.holdSum = vec(0, 0, 0);
  }

  private holdProgress(deg: number, held: number): number {
    return held > 0 ? 0.5 + Math.min(held, 1) * 0.5 : Math.min(0.99, deg / this.options.minTiltDeg) * 0.5;
  }

  private finish(nodded: Vector3, sample: MotionSample) {
    const neutral = this.neutral!;
    const nodDir = normalize(projectOntoPlane(nodded, neutral));
    // Remove any nodding mixed into the side-tilt direction.
    const side = normalize(sub(this.sideDir!, scale(nodDir, dot(this.sideDir!, nodDir))));
    this.result = {
      neutralGravity: neutral,
      forwardAxis: normalize(cross(neutral, side)),
      sensorLocation: sample.sensorLocation,
      createdAt: Date.now(),
    };
    this.phase = 'done';
  }

  private status(progress: number, tooMuchMotion: boolean, tiltDeg: number, stillSideways = false): CalibratorStatus {
    return { phase: this.phase, progress, tooMuchMotion, tiltDeg, stillSideways, result: this.result };
  }
}

/** Synthetic helper for tests and demo mode: gravity for a head tilted `deg` to the right. */
export function demoGravity(deg: number, nodDeg = 0): Vector3 {
  // Arbitrary sensor frame: gravity along -z when upright, tilt rotates it towards +x, nodding towards +y.
  const r = (deg * Math.PI) / 180;
  const n = (nodDeg * Math.PI) / 180;
  return vec(Math.sin(r), Math.cos(r) * Math.sin(n), -Math.cos(r) * Math.cos(n));
}
