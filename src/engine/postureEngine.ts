import { Ema } from './filters';
import { PostureStateMachine } from './postureStateMachine';
import { type Calibration, lateralTiltDeg, poseDeviation } from './tilt';
import type { MotionSample, PauseReason, PostureEvent, PostureSettings, PostureState } from './types';
import { type Vector3, length } from './vector';

/** Keep judging paused this long after fast head movement stops (s). */
const MOTION_GATE_HOLD_SEC = 0.8;

/**
 * Beyond these the sideways angle is unreliable (lying down, bent far forward), so judging pauses.
 * Judging resumes once the head is back inside by OUT_OF_RANGE_HYSTERESIS_DEG, so it doesn't flicker.
 */
export const OUT_OF_RANGE_PITCH_DEG = 50;
export const OUT_OF_RANGE_TOTAL_DEG = 60;
const OUT_OF_RANGE_HYSTERESIS_DEG = 5;

export type PostureSnapshot = {
  t: number;
  /** Smoothed signed tilt (deg), negative = left. */
  angle: number;
  rawAngle: number;
  state: PostureState;
  pauseReason: PauseReason | null;
  events: PostureEvent[];
};

/** Turns raw headphone motion samples into a smoothed tilt angle, posture state and alert events. */
export class PostureEngine {
  private readonly angleFilter: Ema;
  private readonly accelFilter = new Ema(1);
  private readonly machine: PostureStateMachine;
  private movingUntil = -Infinity;
  private outOfRange = false;

  constructor(
    private calibration: Calibration | null,
    private settings: PostureSettings,
  ) {
    this.angleFilter = new Ema(settings.smoothingSec);
    this.machine = new PostureStateMachine(settings);
  }

  setCalibration(calibration: Calibration | null): void {
    this.calibration = calibration;
    this.angleFilter.reset();
  }

  setSettings(settings: PostureSettings): void {
    this.settings = settings;
    this.machine.setSettings(settings);
  }

  process(sample: MotionSample): PostureSnapshot {
    const t = sample.timestamp;
    const rawAngle = this.calibration ? lateralTiltDeg(sample.gravity, this.calibration) : 0;
    this.outOfRange = this.calibration ? this.isOutOfRange(sample.gravity, this.calibration) : false;
    // Keep the meaningless angles from out of range out of the smoothing, so it starts fresh once back.
    if (this.outOfRange) this.angleFilter.reset();
    const angle = this.outOfRange ? 0 : this.angleFilter.update(rawAngle, t);
    const accel = this.accelFilter.update(length(sample.userAcceleration), t);

    if (length(sample.rotationRate) > this.settings.motionGateRadPerSec) {
      this.movingUntil = t + MOTION_GATE_HOLD_SEC;
    }

    let pauseReason: PauseReason | null = null;
    if (!this.calibration) pauseReason = 'notCalibrated';
    else if (this.outOfRange) pauseReason = 'outOfRange';
    else if (t < this.movingUntil) pauseReason = 'moving';
    else if (!this.settings.measureWhileWalking && accel > this.settings.walkingAccelG) pauseReason = 'walking';

    return this.judge(t, angle, rawAngle, pauseReason);
  }

  private isOutOfRange(gravity: Vector3, calibration: Calibration): boolean {
    const { pitchDeg, totalDeg } = poseDeviation(gravity, calibration);
    const margin = this.outOfRange ? OUT_OF_RANGE_HYSTERESIS_DEG : 0;
    const pitchOut = pitchDeg !== null && Math.abs(pitchDeg) > OUT_OF_RANGE_PITCH_DEG - margin;
    return pitchOut || totalDeg > OUT_OF_RANGE_TOTAL_DEG - margin;
  }

  /** Call when no samples arrive (earbuds removed / disconnected). */
  pause(t: number, reason: PauseReason): PostureSnapshot {
    return this.judge(t, 0, 0, reason);
  }

  private judge(t: number, angle: number, rawAngle: number, pauseReason: PauseReason | null): PostureSnapshot {
    const events = this.machine.update(t, angle, pauseReason !== null);
    return { t, angle, rawAngle, state: this.machine.state, pauseReason, events };
  }
}
