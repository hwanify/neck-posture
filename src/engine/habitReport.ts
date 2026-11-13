import { ANGLE_HIST_MAX, type SessionSummary } from './sessionStats';

/** Seconds per timeline bucket (see SessionStats). */
const BUCKET_SEC = 5;

export type HabitReport = {
  /** Judged (non-paused) seconds. */
  measuredSec: number;
  /**
   * Where the head usually sat: the 1° bin it spent the most judged time in (signed, negative =
   * left), lightly smoothed so one noisy bin can't win. Null when nothing was measured.
   */
  usualAngle: number | null;
  /** Time per 1° bin (index 0 = -ANGLE_HIST_MAX°): seconds, or 5-second steps on older sessions. */
  angleHist: number[];
  /** Shares of judged time: tilted left, upright, tilted right (sum to 1, or all 0). */
  leftShare: number;
  goodShare: number;
  rightShare: number;
  /** Separate times the head tilted. */
  episodes: number;
  /** Longest single tilt, in seconds. */
  longestTiltSec: number;
  /** Usual angle in the first and second half of the session; null when it was too short (< 2 min). */
  halves: { first: number; second: number } | null;
};

/** Judged 5-second steps needed before the halves are compared. */
const MIN_HALVES_STEPS = 24;

/** Summary of a session for the report, judged against the alert angle `thresholdDeg`. */
export function habitReport(s: SessionSummary, thresholdDeg: number): HabitReport {
  const measuredSec = s.goodSec + s.tiltSec;
  const share = (x: number) => (measuredSec > 0 ? x / measuredSec : 0);

  // Older sessions have no per-sample data: fall back to the 5-second timeline.
  const hist = s.angleHist ?? timelineHist(s.timeline);
  const runs = s.tiltEpisodes === undefined ? timelineRuns(s.timeline, thresholdDeg) : null;

  const judged = s.timeline.filter((a) => a !== null).length;
  const mid = Math.floor(s.timeline.length / 2);
  const first = usualOf(timelineHist(s.timeline.slice(0, mid)));
  const second = usualOf(timelineHist(s.timeline.slice(mid)));
  const halves = judged >= MIN_HALVES_STEPS && first !== null && second !== null ? { first, second } : null;

  return {
    measuredSec,
    halves,
    angleHist: hist,
    usualAngle: usualOf(hist),
    leftShare: share(s.leftTiltSec),
    goodShare: share(s.goodSec),
    rightShare: share(s.rightTiltSec),
    episodes: runs ? runs.count : (s.tiltEpisodes ?? 0),
    longestTiltSec: runs ? runs.longestSec : (s.longestTiltSec ?? 0),
  };
}

const usualOf = (hist: number[]) => (hist.some((x) => x > 0) ? modeBin(hist) - ANGLE_HIST_MAX : null);

function timelineHist(timeline: (number | null)[]): number[] {
  const hist = Array<number>(2 * ANGLE_HIST_MAX + 1).fill(0);
  for (const a of timeline) {
    if (a !== null) hist[Math.max(-ANGLE_HIST_MAX, Math.min(ANGLE_HIST_MAX, Math.round(a))) + ANGLE_HIST_MAX] += 1;
  }
  return hist;
}

function timelineRuns(timeline: (number | null)[], thresholdDeg: number) {
  let run = 0;
  let longest = 0;
  let count = 0;
  for (const a of timeline) {
    const tilt = a !== null && Math.abs(a) >= thresholdDeg;
    if (tilt && run === 0) count += 1;
    run = tilt ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return { count, longestSec: longest * BUCKET_SEC };
}

/** Index of the peak after a [1, 2, 1] smoothing; ties go to the bin with more raw time. */
function modeBin(bins: number[]): number {
  let best = -1;
  let bestScore = -1;
  bins.forEach((n, i) => {
    if (n === 0) return;
    const score = (bins[i - 1] ?? 0) + 2 * n + (bins[i + 1] ?? 0);
    if (score > bestScore || (score === bestScore && n > bins[best])) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}
