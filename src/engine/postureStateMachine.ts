import type { PostureEvent, PostureSettings, PostureState, TiltDirection } from './types';

/** An alert interval of 0 repeats as soon as the previous cue (~0.35 s) has finished. */
const MIN_REPEAT_SEC = 0.5;

/**
 * good ──|θ|≥enter──▶ tilting ──held holdSec──▶ alerted ──|θ|<exit──▶ good
 *   ▲                    │                       │ still tilted after cooldown → alert again
 *   └─────|θ|<exit───────┘
 * Any state ──paused──▶ paused ──resume──▶ good
 */
export class PostureStateMachine {
  state: PostureState = 'good';
  private tiltStart = 0;
  private lastAlertAt = 0;
  private repeats = 0;

  constructor(private settings: PostureSettings) {}

  setSettings(settings: PostureSettings): void {
    this.settings = settings;
  }

  /** `t` in seconds, `angle` in degrees (negative = left). */
  update(t: number, angle: number, paused: boolean): PostureEvent[] {
    if (paused) {
      this.state = 'paused';
      return [];
    }
    if (this.state === 'paused') {
      this.state = 'good';
    }

    const { enterDeg, exitDeg, holdSec, cooldownSec } = this.settings;
    const abs = Math.abs(angle);
    const direction: TiltDirection = angle >= 0 ? 'right' : 'left';

    switch (this.state) {
      case 'good':
        if (abs >= enterDeg) {
          this.state = 'tilting';
          this.tiltStart = t;
        }
        return [];

      case 'tilting':
        if (abs < exitDeg) {
          this.state = 'good';
          return [{ type: 'recovered', at: t, afterAlert: false }];
        }
        if (t - this.tiltStart >= holdSec) {
          this.state = 'alerted';
          this.lastAlertAt = t;
          this.repeats = 0;
          return [{ type: 'alert', at: t, direction, angle, repeat: 0 }];
        }
        return [];

      case 'alerted': {
        if (abs < exitDeg) {
          this.state = 'good';
          this.repeats = 0;
          return [{ type: 'recovered', at: t, afterAlert: true }];
        }
        if (t - this.lastAlertAt >= Math.max(cooldownSec, MIN_REPEAT_SEC)) {
          this.repeats += 1;
          this.lastAlertAt = t;
          return [{ type: 'alert', at: t, direction, angle, repeat: this.repeats }];
        }
        return [];
      }
    }
    return [];
  }
}
