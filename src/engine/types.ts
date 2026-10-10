import type { MotionSample } from '../../modules/headphone-motion';

export type { MotionSample };
export type SensorLocation = MotionSample['sensorLocation'];
export type TiltDirection = 'left' | 'right';
export type PostureState = 'good' | 'tilting' | 'alerted' | 'paused';
export type PauseReason = 'moving' | 'walking' | 'disconnected' | 'notCalibrated';

export type PostureSettings = {
  /** Tilt (deg) that starts the "tilting" timer. */
  enterDeg: number;
  /** Tilt (deg) below which posture counts as recovered (hysteresis). */
  exitDeg: number;
  /** Seconds a tilt must last before alerting. */
  holdSec: number;
  /** Fixed seconds between alerts while still tilted (0 = right after the previous cue). */
  cooldownSec: number;
  /** Angle smoothing time constant (s). */
  smoothingSec: number;
  /** Head rotation speed (rad/s) above which judging pauses (looking around, nodding). */
  motionGateRadPerSec: number;
  /** Smoothed user acceleration (g) above which the user counts as walking. */
  walkingAccelG: number;
  /** Keep judging posture while walking instead of pausing. */
  measureWhileWalking: boolean;
};

export const DEFAULT_POSTURE_SETTINGS: PostureSettings = {
  enterDeg: 5,
  exitDeg: 2,
  holdSec: 2,
  cooldownSec: 5,
  smoothingSec: 0.3,
  motionGateRadPerSec: 1.2,
  walkingAccelG: 0.15,
  measureWhileWalking: true,
};

export type PostureEvent =
  | { type: 'alert'; at: number; direction: TiltDirection; angle: number; repeat: number }
  | { type: 'recovered'; at: number; afterAlert: boolean };
