import { Ema } from './filters';
import { PostureStateMachine } from './postureStateMachine';
import { type Calibration, lateralTiltDeg } from './tilt';
import type { MotionSample, PauseReason, PostureEvent, PostureSettings, PostureState } from './types';
import { length } from './vector';

/** Keep judging paused this long after fast head movement stops (s). */
const MOTION_GATE_HOLD_SEC = 0.8;

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
    const angle = this.angleFilter.update(rawAngle, t);
    const accel = this.accelFilter.update(length(sample.userAcceleration), t);

    if (length(sample.rotationRate) > this.settings.motionGateRadPerSec) {
      this.movingUntil = t + MOTION_GATE_HOLD_SEC;
    }

    let pauseReason: PauseReason | null = null;
    if (!this.calibration) pauseReason = 'notCalibrated';
    else if (t < this.movingUntil) pauseReason = 'moving';
    else if (accel > this.settings.walkingAccelG) pauseReason = 'walking';

    return this.judge(t, angle, rawAngle, pauseReason);
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
