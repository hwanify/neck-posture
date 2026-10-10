import { type Calibration, pitchDeg, rollDeg } from './tilt';
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

export type CalibratorPhase = 'neutral' | 'tiltLeft' | 'tiltRight' | 'nodForward' | 'nodBack' | 'done';

/** Why the current pose isn't being accepted yet. */
export type CalibratorHint = 'none' | 'wrongSide' | 'stillSideways' | 'retry';

export type CalibratorStatus = {
  phase: CalibratorPhase;
  /** 0...1 progress within the current phase. */
  progress: number;
  /** User is moving too much during the neutral phase. */
  tooMuchMotion: boolean;
  /** Current angle away from neutral in the active direction (deg, unsigned). */
  tiltDeg: number;
  hint: CalibratorHint;
  result?: Calibration;
};

export type CalibratorOptions = {
  neutralSec: number;
  maxRotationRate: number;
  minTiltDeg: number;
  holdSec: number;
  /** Sideways tilt (deg) still accepted while nodding: max(this, nod × sidewaysRatio). */
  maxSidewaysDuringNodDeg: number;
  sidewaysRatio: number;
  /** Left/right and front/back directions closer than this (deg) mean a sloppy run → redo. */
  minAxisSeparationDeg: number;
  /** Clamp for the per-degree nod leak correction. */
  maxLeak: number;
};

const DEFAULTS: CalibratorOptions = {
  neutralSec: 3,
  maxRotationRate: 0.5,
  minTiltDeg: 14,
  holdSec: 1,
  maxSidewaysDuringNodDeg: 6,
  sidewaysRatio: 0.35,
  minAxisSeparationDeg: 70,
  maxLeak: 0.5,
};

const asinDeg = (x: number) => Math.asin(Math.max(-1, Math.min(1, x))) * RAD_TO_DEG;
const clamp = (x: number, limit: number) => Math.max(-limit, Math.min(limit, x));

/**
 * Five-step calibration fed with live samples:
 * 1. sit straight and still → average gravity is the neutral reference N
 * 2–3. tilt left, then right → side direction = R − L (any nodding common to both cancels out)
 * 4–5. nod forward, then back → front/back direction = F − B
 *
 * Lateral tilt is measured around the front/back direction, so nodding contributes nothing by
 * construction. Whatever sideways drift remains in the user's own nod (necks don't move in a perfect
 * plane) is stored as per-degree leak coefficients and subtracted at runtime.
 */
export class Calibrator {
  private readonly options: CalibratorOptions;
  private phase: CalibratorPhase = 'neutral';
  private gravitySum: Vector3 = vec(0, 0, 0);
  private phaseStart: number | null = null;
  private neutral: Vector3 | null = null;
  private poses: Partial<Record<'tiltLeft' | 'tiltRight' | 'nodForward' | 'nodBack', Vector3>> = {};
  /** Clean side direction (⟂ N), known after tiltRight. */
  private side: Vector3 | null = null;
  private holdSum: Vector3 = vec(0, 0, 0);
  private holdStart: number | null = null;
  private retried = false;
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
        this.phase = 'tiltLeft';
        return this.status(0, false, 0);
      }
      return this.status(progress, false, 0);
    }

    if (this.phase === 'done') return this.status(1, false, 0);

    const neutral = this.neutral!;
    const offset = projectOntoPlane(g, neutral);
    const angle = angleBetweenDeg(neutral, g);
    const { minTiltDeg } = this.options;

    switch (this.phase) {
      case 'tiltLeft':
        return this.step(sample, angle, angle >= minTiltDeg, 'none', 'tiltRight');

      case 'tiltRight': {
        // Must be on the other side of neutral from the left pose.
        const left = projectOntoPlane(this.poses.tiltLeft!, neutral);
        const opposite = dot(offset, left) < 0;
        const hint = angle >= minTiltDeg && !opposite ? 'wrongSide' : 'none';
        return this.step(sample, angle, angle >= minTiltDeg && opposite, hint, 'nodForward');
      }

      case 'nodForward':
      case 'nodBack': {
        const side = this.side!;
        const sideways = Math.abs(asinDeg(dot(offset, side)));
        const nod = asinDeg(length(sub(offset, scale(side, dot(offset, side)))));
        const stillSideways =
          sideways > Math.max(this.options.maxSidewaysDuringNodDeg, nod * this.options.sidewaysRatio);
        let wrongSide = false;
        if (this.phase === 'nodBack') {
          const forward = projectOntoPlane(this.poses.nodForward!, neutral);
          wrongSide = dot(offset, forward) > 0;
        }
        const inPose = nod >= minTiltDeg && !stillSideways && !wrongSide;
        const hint =
          nod >= minTiltDeg / 2 && stillSideways
            ? 'stillSideways'
            : nod >= minTiltDeg && wrongSide
              ? 'wrongSide'
              : 'none';
        return this.step(sample, nod, inPose, hint, this.phase === 'nodForward' ? 'nodBack' : 'done');
      }
    }
  }

  /** Hold `inPose` for holdSec, then store the averaged pose and advance to `next`. */
  private step(
    sample: MotionSample,
    deg: number,
    inPose: boolean,
    hint: CalibratorHint,
    next: CalibratorPhase,
  ): CalibratorStatus {
    const t = sample.timestamp;
    if (!inPose) {
      this.resetHold();
      const retryHint = this.retried && this.phase === 'tiltLeft' && hint === 'none' ? 'retry' : hint;
      return this.status(Math.min(0.99, deg / this.options.minTiltDeg) * 0.5, false, deg, retryHint);
    }
    if (this.holdStart === null) this.holdStart = t;
    this.holdSum = add(this.holdSum, normalize(sample.gravity));
    const held = (t - this.holdStart) / this.options.holdSec;
    if (held < 1) return this.status(0.5 + held * 0.5, false, deg);

    const phase = this.phase as keyof Calibrator['poses'];
    this.poses[phase] = normalize(this.holdSum);
    this.resetHold();
    if (phase === 'tiltRight') {
      const neutral = this.neutral!;
      this.side = normalize(projectOntoPlane(sub(this.poses.tiltRight!, this.poses.tiltLeft!), neutral));
    }
    if (next === 'done') {
      this.finish(sample);
    } else {
      this.phase = next;
    }
    return this.status(this.phase === 'done' ? 1 : 0, false, deg);
  }

  private resetHold() {
    this.holdStart = null;
    this.holdSum = vec(0, 0, 0);
  }

  private finish(sample: MotionSample) {
    const neutral = this.neutral!;
    const { tiltRight, nodForward, nodBack } = this.poses as Required<Calibrator['poses']>;
    const side = this.side!;
    const nodRaw = normalize(projectOntoPlane(sub(nodForward, nodBack), neutral));

    if (Math.abs(90 - angleBetweenDeg(side, nodRaw)) > 90 - this.options.minAxisSeparationDeg) {
      // Side and nod directions far from perpendicular: one of the poses was off. Redo the moves.
      this.poses = {};
      this.side = null;
      this.retried = true;
      this.phase = 'tiltLeft';
      return;
    }

    // Exactly perpendicular to both neutral and the side direction, pointing towards a forward nod.
    let pitchAxis = normalize(cross(neutral, side));
    if (dot(pitchAxis, nodRaw) < 0) pitchAxis = scale(pitchAxis, -1);

    // Tilt is measured around the front/back axis; orient it so a right tilt is positive.
    let forwardAxis = pitchAxis;
    if (rollDeg(tiltRight, neutral, forwardAxis) < 0) forwardAxis = scale(forwardAxis, -1);

    const leak = (pose: Vector3) => {
      const pitch = pitchDeg(pose, neutral, pitchAxis);
      return Math.abs(pitch) < 1 ? 0 : clamp(rollDeg(pose, neutral, forwardAxis) / pitch, this.options.maxLeak);
    };

    this.result = {
      neutralGravity: neutral,
      forwardAxis,
      pitchAxis,
      leakForward: leak(nodForward),
      leakBack: leak(nodBack),
      sensorLocation: sample.sensorLocation,
      createdAt: Date.now(),
    };
    this.phase = 'done';
  }

  private status(
    progress: number,
    tooMuchMotion: boolean,
    tiltDeg: number,
    hint: CalibratorHint = 'none',
  ): CalibratorStatus {
    return { phase: this.phase, progress, tooMuchMotion, tiltDeg, hint, result: this.result };
  }
}

/** Calibration that matches `demoGravity`, so demo mode can measure without calibrating first. */
export const DEMO_CALIBRATION: Calibration = {
  neutralGravity: vec(0, 0, -1),
  forwardAxis: vec(0, -1, 0),
  pitchAxis: vec(0, 1, 0),
  leakForward: 0,
  leakBack: 0,
  sensorLocation: 'default',
  createdAt: 0,
};

/** Synthetic helper for tests and demo mode: gravity for a head tilted `deg` to the right. */
export function demoGravity(deg: number, nodDeg = 0): Vector3 {
  // Arbitrary sensor frame: gravity along -z when upright, tilt rotates it towards +x, nodding towards +y.
  const r = (deg * Math.PI) / 180;
  const n = (nodDeg * Math.PI) / 180;
  return vec(Math.sin(r), Math.cos(r) * Math.sin(n), -Math.cos(r) * Math.cos(n));
}
