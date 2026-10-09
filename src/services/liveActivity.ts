import HeadphoneMotion, { type LiveActivityInfo, type LiveActivityStatus } from '../../modules/headphone-motion';

/** Push at most this often, and only when the shown values change. */
const MIN_INTERVAL_MS = 1000;
/** Re-send unchanged values so the activity doesn't go stale while the app is alive. */
const HEARTBEAT_MS = 30_000;

type Shown = { angle: number; status: LiveActivityStatus; goodPercent: number };

/**
 * Session Live Activity on the Lock Screen / Dynamic Island. No-op without the native module
 * (Expo Go) or when the user disabled Live Activities.
 */
class LiveActivityService {
  private active = false;
  private lastSent: Shown | null = null;
  private lastSentAt = 0;
  private pending: ReturnType<typeof setTimeout> | null = null;
  private latest: Shown | null = null;
  private startError: string | null = null;

  async start(startedAt: number, angle: number, status: LiveActivityStatus, goodRatio: number): Promise<void> {
    if (!HeadphoneMotion) return;
    const shown = toShown(angle, status, goodRatio);
    this.startError = null;
    try {
      this.active = await HeadphoneMotion.startLiveActivity(startedAt, shown.angle, shown.status, shown.goodPercent);
      if (!this.active) this.startError = 'iPhone 설정에서 실시간 현황이 꺼져 있어요';
    } catch (e) {
      this.active = false;
      this.startError = e instanceof Error ? e.message : String(e);
    }
    this.lastSent = shown;
    this.lastSentAt = Date.now();
  }

  update(angle: number, status: LiveActivityStatus, goodRatio: number): void {
    if (!this.active) return;
    this.latest = toShown(angle, status, goodRatio);
    const changed =
      !this.lastSent ||
      this.latest.angle !== this.lastSent.angle ||
      this.latest.status !== this.lastSent.status ||
      this.latest.goodPercent !== this.lastSent.goodPercent;
    const since = Date.now() - this.lastSentAt;
    if (!changed && since < HEARTBEAT_MS) return;
    if (since >= MIN_INTERVAL_MS) this.flush();
    else this.pending ??= setTimeout(() => this.flush(), MIN_INTERVAL_MS - since);
  }

  async end(): Promise<void> {
    if (this.pending) clearTimeout(this.pending);
    this.pending = null;
    this.active = false;
    this.lastSent = null;
    await HeadphoneMotion?.endLiveActivity().catch(() => {});
  }

  /** The activity isn't showing (failed to start, ended or swiped away) and can be started again. */
  needsRestart(): boolean {
    const state = this.diagnostics().native?.state;
    return !this.active || state === 'none' || state === 'ended' || state === 'dismissed';
  }

  /** For the settings screen: what the app sent vs. what iOS applied. */
  diagnostics(): { startError: string | null; native: LiveActivityInfo | null } {
    let native: LiveActivityInfo | null = null;
    try {
      native = HeadphoneMotion?.getLiveActivityInfo?.() ?? null;
    } catch {
      native = null;
    }
    return { startError: this.startError, native };
  }

  private flush() {
    if (this.pending) clearTimeout(this.pending);
    this.pending = null;
    if (!this.active || !this.latest) return;
    const shown = this.latest;
    this.lastSent = shown;
    this.lastSentAt = Date.now();
    void HeadphoneMotion?.updateLiveActivity(shown.angle, shown.status, shown.goodPercent).catch(() => {});
  }
}

function toShown(angle: number, status: LiveActivityStatus, goodRatio: number): Shown {
  return { angle: Math.round(angle), status, goodPercent: Math.round(goodRatio * 100) };
}

export const liveActivity = new LiveActivityService();
