import type { SessionSummary } from './sessionStats';

/** Seconds per timeline bucket (see SessionStats). */
const BUCKET_SEC = 5;
/** Window for "when the tilting started": one minute of buckets. */
const WINDOW = 60 / BUCKET_SEC;
/** Distribution range: -HIST_MAX..+HIST_MAX degrees in 1° bins (outer bins collect anything beyond). */
export const HIST_MAX = 20;

export type HabitTrend = 'later' | 'earlier' | 'steady';

export type HabitReport = {
  /** Judged (non-paused) seconds. */
  measuredSec: number;
  /** Share of judged time spent tilted, 0..1. */
  tiltShare: number;
  /** Side tilted to more often, or null when there was no tilt. */
  side: 'left' | 'right' | null;
  /** Share of tilted time on `side`, 0..1. */
  sideShare: number;
  avgAbsAngle: number;
  /** Longest run of tilted 5-second buckets, in seconds. */
  longestTiltSec: number;
  /** Seconds from the start until the first minute whose mean |angle| reached the threshold. */
  firstTiltAfterSec: number | null;
  /** Whether the second half was more tilted than the first. */
  trend: HabitTrend;
  /**
   * The angle the head usually settles at when it tilts: the most common 1° bin among tilted
   * buckets (signed, negative = left), lightly smoothed so one noisy bin can't win. Null without tilt.
   */
  typicalAngle: number | null;
  /** Count of judged 5-second buckets per 1° bin, index 0 = -HIST_MAX° … index 2·HIST_MAX = +HIST_MAX°. */
  histogram: number[];
  /** Separate times the head tilted (runs of tilted buckets). */
  episodes: number;
  /** Mean length of one tilt, in seconds (0 without tilt). */
  avgEpisodeSec: number;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Summary of a silent (habit) session, judged against the alert angle `thresholdDeg`. */
export function habitReport(s: SessionSummary, thresholdDeg: number): HabitReport {
  const measuredSec = s.goodSec + s.tiltSec;
  const tilted = s.leftTiltSec + s.rightTiltSec;
  const side = tilted <= 0 ? null : s.rightTiltSec >= s.leftTiltSec ? 'right' : 'left';

  let run = 0;
  let longest = 0;
  let episodes = 0;
  let tiltedBuckets = 0;
  const histogram = Array<number>(2 * HIST_MAX + 1).fill(0);
  const tiltedBins = Array<number>(2 * HIST_MAX + 1).fill(0);
  for (const a of s.timeline) {
    const tilt = a !== null && Math.abs(a) >= thresholdDeg;
    if (tilt && run === 0) episodes += 1;
    run = tilt ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (a === null) continue;
    const bin = Math.max(-HIST_MAX, Math.min(HIST_MAX, Math.round(a))) + HIST_MAX;
    histogram[bin] += 1;
    if (tilt) {
      tiltedBins[bin] += 1;
      tiltedBuckets += 1;
    }
  }
  const typicalAngle = tiltedBuckets > 0 ? modeBin(tiltedBins) - HIST_MAX : null;

  let firstTiltAfterSec: number | null = null;
  for (let i = 0; i + WINDOW <= s.timeline.length; i++) {
    const window = s.timeline.slice(i, i + WINDOW).filter((a): a is number => a !== null);
    if (window.length >= WINDOW / 2 && mean(window.map(Math.abs)) >= thresholdDeg) {
      firstTiltAfterSec = i * BUCKET_SEC;
      break;
    }
  }

  const judged = s.timeline.filter((a): a is number => a !== null).map(Math.abs);
  const half = Math.floor(judged.length / 2);
  const first = mean(judged.slice(0, half));
  const second = mean(judged.slice(half));
  const trend: HabitTrend =
    judged.length < WINDOW ? 'steady' : second - first >= 2 ? 'later' : first - second >= 2 ? 'earlier' : 'steady';

  return {
    measuredSec,
    tiltShare: measuredSec > 0 ? s.tiltSec / measuredSec : 0,
    side,
    sideShare: side === null ? 0 : (side === 'right' ? s.rightTiltSec : s.leftTiltSec) / tilted,
    avgAbsAngle: s.avgAbsAngle,
    longestTiltSec: longest * BUCKET_SEC,
    firstTiltAfterSec,
    trend,
    typicalAngle,
    histogram,
    episodes,
    avgEpisodeSec: episodes > 0 ? (tiltedBuckets * BUCKET_SEC) / episodes : 0,
  };
}

/** Index of the peak after a [1, 2, 1] smoothing; ties go to the bin with more raw hits. */
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
