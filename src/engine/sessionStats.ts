import type { PostureEvent, PostureState } from './types';

/** Gaps longer than this (s) between samples are not counted (sensor dropped out). */
const MAX_SAMPLE_GAP_SEC = 1;
const TIMELINE_BUCKET_SEC = 5;
/** Angle histogram range: 1° bins from -ANGLE_HIST_MAX to +ANGLE_HIST_MAX (ends collect anything beyond). */
export const ANGLE_HIST_MAX = 20;

export type SessionSummary = {
  id: string;
  startedAt: number;
  endedAt: number;
  goodSec: number;
  tiltSec: number;
  pausedSec: number;
  leftTiltSec: number;
  rightTiltSec: number;
  alertCount: number;
  /** Mean |angle| over judged (non-paused) time. */
  avgAbsAngle: number;
  /** Mean signed angle over judged time: negative = leaning left on average. Missing on old sessions. */
  avgAngle?: number;
  /** Mean signed angle per 5-second bucket; null where the whole bucket was paused. */
  timeline: (number | null)[];
  /** 'habit' for silent measuring (no cues); missing on alert sessions. */
  mode?: 'habit';
  /** Judged seconds per 1° bin (index 0 = -ANGLE_HIST_MAX°). Missing on old sessions. */
  angleHist?: number[];
  /** Times the head went from upright to tilted. Missing on old sessions. */
  tiltEpisodes?: number;
  /** Longest single tilt, in seconds. Missing on old sessions. */
  longestTiltSec?: number;
};

export class SessionStats {
  private goodSec = 0;
  private tiltSec = 0;
  private pausedSec = 0;
  private leftTiltSec = 0;
  private rightTiltSec = 0;
  private alertCount = 0;
  private absAngleIntegral = 0;
  private angleIntegral = 0;
  private lastT: number | null = null;
  private readonly angleHist = Array<number>(2 * ANGLE_HIST_MAX + 1).fill(0);
  private tiltEpisodes = 0;
  private inTilt = false;
  private tiltRunSec = 0;
  private longestTiltSec = 0;
  private firstT: number | null = null;
  private bucketSum = 0;
  private bucketCount = 0;
  private bucketIndex = 0;
  private readonly timeline: (number | null)[] = [];

  constructor(
    readonly id: string,
    readonly startedAt: number,
  ) {}

  add(t: number, angle: number, state: PostureState, events: PostureEvent[]): void {
    this.alertCount += events.filter((e) => e.type === 'alert').length;
    if (this.firstT === null) this.firstT = t;

    const tilted = state === 'tilting' || state === 'alerted';
    if (tilted && !this.inTilt) {
      this.tiltEpisodes += 1;
      this.tiltRunSec = 0;
    }
    this.inTilt = tilted;

    if (this.lastT !== null) {
      const dt = t - this.lastT;
      if (dt > 0 && dt <= MAX_SAMPLE_GAP_SEC) {
        if (state === 'paused') {
          this.pausedSec += dt;
        } else {
          this.absAngleIntegral += Math.abs(angle) * dt;
          this.angleIntegral += angle * dt;
          this.angleHist[Math.max(-ANGLE_HIST_MAX, Math.min(ANGLE_HIST_MAX, Math.round(angle))) + ANGLE_HIST_MAX] += dt;
          if (state === 'good') {
            this.goodSec += dt;
          } else {
            this.tiltRunSec += dt;
            this.longestTiltSec = Math.max(this.longestTiltSec, this.tiltRunSec);
            this.tiltSec += dt;
            if (angle < 0) this.leftTiltSec += dt;
            else this.rightTiltSec += dt;
          }
        }
      }
    }
    this.lastT = t;

    const bucket = Math.floor((t - this.firstT) / TIMELINE_BUCKET_SEC);
    while (this.bucketIndex < bucket) this.flushBucket();
    if (state !== 'paused') {
      this.bucketSum += angle;
      this.bucketCount += 1;
    }
  }

  get liveAlertCount(): number {
    return this.alertCount;
  }

  get goodRatio(): number {
    const judged = this.goodSec + this.tiltSec;
    return judged > 0 ? this.goodSec / judged : 1;
  }

  summary(endedAt: number): SessionSummary {
    const judged = this.goodSec + this.tiltSec;
    const timeline = [...this.timeline];
    if (this.bucketCount > 0) timeline.push(round1(this.bucketSum / this.bucketCount));
    return {
      id: this.id,
      startedAt: this.startedAt,
      endedAt,
      goodSec: round1(this.goodSec),
      tiltSec: round1(this.tiltSec),
      pausedSec: round1(this.pausedSec),
      leftTiltSec: round1(this.leftTiltSec),
      rightTiltSec: round1(this.rightTiltSec),
      alertCount: this.alertCount,
      avgAbsAngle: judged > 0 ? round1(this.absAngleIntegral / judged) : 0,
      avgAngle: judged > 0 ? round1(this.angleIntegral / judged) : 0,
      timeline,
      angleHist: this.angleHist.map(round1),
      tiltEpisodes: this.tiltEpisodes,
      longestTiltSec: round1(this.longestTiltSec),
    };
  }

  private flushBucket(): void {
    this.timeline.push(this.bucketCount > 0 ? round1(this.bucketSum / this.bucketCount) : null);
    this.bucketSum = 0;
    this.bucketCount = 0;
    this.bucketIndex += 1;
  }
}

const round1 = (x: number) => Math.round(x * 10) / 10;
