import type { Calibration } from './tilt';
import type { MotionSample } from './types';
import { type Vector3, add, angleBetweenDeg, cross, length, normalize, rotateAround, vec } from './vector';

export type PostureCheckStatus = {
  /** 0...1 progress of the still period. */
  progress: number;
  /** Moved too much; the still period restarted. */
  tooMuchMotion: boolean;
  /** Set once finished: the calibration re-based on today's neutral posture. */
  result?: { calibration: Calibration; shiftDeg: number };
};

export type PostureCheckOptions = { durationSec: number; maxRotationRate: number };

const DEFAULTS: PostureCheckOptions = { durationSec: 5, maxRotationRate: 0.5 };
const MAX_GAP_SEC = 0.5;

/**
 * Pre-session check: hold still for a few seconds so the earbuds' current seating becomes the new
 * neutral. The stored calibration's axes are rotated by the same amount the neutral moved, so
 * re-seating the AirPods (which tips the sensor frame) doesn't show up as a tilt.
 */
export class PostureCheck {
  private readonly options: PostureCheckOptions;
  private start: number | null = null;
  private sum: Vector3 = vec(0, 0, 0);
  private lastT: number | null = null;
  private result: PostureCheckStatus['result'];

  constructor(
    private readonly base: Calibration,
    options: Partial<PostureCheckOptions> = {},
  ) {
    this.options = { ...DEFAULTS, ...options };
  }

  feed(sample: MotionSample): PostureCheckStatus {
    if (this.result) return { progress: 1, tooMuchMotion: false, result: this.result };
    const t = sample.timestamp;
    const moving = length(sample.rotationRate) > this.options.maxRotationRate;
    // A gap means the earbuds dropped out; don't let it count as holding still.
    const gap = this.lastT !== null && t - this.lastT > MAX_GAP_SEC;
    this.lastT = t;
    if (moving || gap || this.start === null) {
      this.sum = vec(0, 0, 0);
      this.start = moving ? null : t;
      if (moving) return { progress: 0, tooMuchMotion: true };
    }
    this.sum = add(this.sum, normalize(sample.gravity));
    const progress = Math.min(1, (t - this.start!) / this.options.durationSec);
    if (progress < 1) return { progress, tooMuchMotion: false };

    const neutral = normalize(this.sum);
    this.result = {
      calibration: rebaseCalibration(this.base, neutral),
      shiftDeg: angleBetweenDeg(this.base.neutralGravity, neutral),
    };
    return { progress: 1, tooMuchMotion: false, result: this.result };
  }
}

/** Moves `calibration` onto a new neutral gravity, rotating its axes by the same (smallest) rotation. */
export function rebaseCalibration(calibration: Calibration, neutral: Vector3): Calibration {
  const from = calibration.neutralGravity;
  const deg = angleBetweenDeg(from, neutral);
  const axisRaw = cross(from, neutral);
  if (deg < 1e-3 || length(axisRaw) < 1e-9) return { ...calibration, neutralGravity: neutral };
  const axis = normalize(axisRaw);
  const rotate = (v: Vector3) => normalize(rotateAround(v, axis, deg));
  return {
    ...calibration,
    neutralGravity: neutral,
    forwardAxis: rotate(calibration.forwardAxis),
    pitchAxis: calibration.pitchAxis ? rotate(calibration.pitchAxis) : undefined,
  };
}
