import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncExternalStore } from 'react';

import type { AuthorizationStatus, MotionSample } from '../../modules/headphone-motion';
import {
  type Calibration,
  Calibrator,
  type CalibratorStatus,
  flipCalibration,
  PostureCheck,
  type PostureCheckStatus,
  PostureEngine,
  type PostureSnapshot,
  type SensorLocation,
  SessionStats,
  type SessionSummary,
  type TiltDirection,
} from '../engine';
import { deliverFeedback, requestNotificationPermission, setBackgroundKeepAlive } from '../services/feedback';
import { createMotionSource, type MotionSourceKind } from '../services/motionSource';
import * as storage from '../services/storage';
import type { AppSettings } from '../services/storage';

/** No samples for this long → treat the earbuds as disconnected / removed. */
const STALE_AFTER_MS = 2000;
const KEEP_AWAKE_TAG = 'baromok-session';
/** Neutral moved more than this since calibration → suggest calibrating again before starting. */
const LARGE_SHIFT_DEG = 25;

export type CheckState = {
  progress: number;
  tooMuchMotion: boolean;
  /** Re-check during a session after the earbuds were removed / swapped. */
  resumed: boolean;
  /** Set when the check finished with a large shift and waits for the user's decision. */
  largeShiftDeg: number | null;
};

export type LiveSession = {
  id: string;
  startedAt: number;
  alertCount: number;
  goodRatio: number;
  lastAlert: { direction: TiltDirection; at: number } | null;
};

export type MonitorState = {
  loaded: boolean;
  onboarded: boolean;
  sourceKind: MotionSourceKind;
  available: boolean;
  authorization: AuthorizationStatus;
  streaming: boolean;
  connected: boolean;
  error: string | null;
  sampleRateHz: number;
  sensorLocation: SensorLocation | null;
  snapshot: PostureSnapshot | null;
  calibration: Calibration | null;
  /** The sensor now comes from a different earbud than during calibration. */
  calibrationMismatch: boolean;
  calibrating: CalibratorStatus | null;
  /** Pre-session 5-second posture check. */
  checking: CheckState | null;
  session: LiveSession | null;
  settings: AppSettings;
  sessions: SessionSummary[];
};

class MonitorController {
  private source = createMotionSource(storage.DEFAULT_SETTINGS.source);
  private engine = new PostureEngine(null, storage.DEFAULT_SETTINGS.posture);
  private calibrator: Calibrator | null = null;
  private check: PostureCheck | null = null;
  private pendingCheck: NonNullable<PostureCheckStatus['result']> | null = null;
  /** Earbuds went silent or switched during a session → re-check once samples return. */
  private needsRecheck = false;
  private stats: SessionStats | null = null;
  private listeners = new Set<() => void>();
  private lastSampleWall = 0;
  private lastSampleT = 0;
  private rateWindow: number[] = [];
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  state: MonitorState = {
    loaded: false,
    onboarded: false,
    sourceKind: this.source.kind,
    available: this.source.isAvailable(),
    authorization: this.source.getAuthorizationStatus(),
    streaming: false,
    connected: false,
    error: null,
    sampleRateHz: 0,
    sensorLocation: null,
    snapshot: null,
    calibration: null,
    calibrationMismatch: false,
    calibrating: null,
    checking: null,
    session: null,
    settings: storage.DEFAULT_SETTINGS,
    sessions: [],
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getState = () => this.state;

  private set(patch: Partial<MonitorState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const [settings, sessions, onboarded] = await Promise.all([
      storage.loadSettings(),
      storage.loadSessions(),
      storage.loadOnboarded(),
    ]);
    this.source = createMotionSource(settings.source);
    const calibration = await storage.loadCalibration(this.source.kind);
    this.engine = new PostureEngine(calibration, settings.posture);
    this.set({
      loaded: true,
      settings,
      calibration,
      sessions,
      onboarded,
      sourceKind: this.source.kind,
      available: this.source.isAvailable(),
      authorization: this.source.getAuthorizationStatus(),
    });

    AppState.addEventListener('change', this.handleAppState);
    if (onboarded) await this.startStreaming();
  }

  async completeOnboarding(): Promise<void> {
    await storage.saveOnboarded();
    this.set({ onboarded: true });
    await this.startStreaming();
  }

  // MARK: - Streaming

  async startStreaming(): Promise<void> {
    if (this.state.streaming) return;
    if (!this.source.isAvailable()) {
      this.set({ available: false, error: '이 기기에서는 헤드폰 모션을 사용할 수 없어요.' });
      return;
    }
    try {
      await this.source.start({
        onSample: this.handleSample,
        onConnectionChange: (connected) => this.set({ connected }),
        onError: (e) => this.set({ error: e.message, authorization: this.source.getAuthorizationStatus() }),
      });
      this.set({ streaming: true, error: null, authorization: this.source.getAuthorizationStatus() });
      this.watchdog ??= setInterval(this.checkStale, 1000);
    } catch (e) {
      this.set({
        error: e instanceof Error ? e.message : String(e),
        authorization: this.source.getAuthorizationStatus(),
      });
    }
  }

  async stopStreaming(): Promise<void> {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
    await this.source.stop();
    this.set({ streaming: false, connected: false, sampleRateHz: 0 });
  }

  private handleAppState = (status: AppStateStatus) => {
    if (!this.state.onboarded) return;
    if (status === 'active') {
      this.set({ authorization: this.source.getAuthorizationStatus() });
      void this.startStreaming();
    } else if (status === 'background') {
      // Without a session (or background mode) there is nothing to watch for — save battery.
      const keepRunning = this.state.session && this.state.settings.feedback.backgroundMode;
      if (!keepRunning) void this.stopStreaming();
    }
  };

  private handleSample = (sample: MotionSample) => {
    const now = Date.now();
    this.lastSampleWall = now;
    this.lastSampleT = sample.timestamp;
    this.rateWindow.push(now);
    while (this.rateWindow.length && this.rateWindow[0] < now - 1000) this.rateWindow.shift();

    const common = {
      connected: true,
      sampleRateHz: this.rateWindow.length,
      sensorLocation: sample.sensorLocation,
      calibrationMismatch:
        !!this.state.calibration &&
        this.state.calibration.sensorLocation !== 'default' &&
        sample.sensorLocation !== 'default' &&
        this.state.calibration.sensorLocation !== sample.sensorLocation,
    };

    if (
      this.state.session &&
      !this.check &&
      !this.pendingCheck &&
      (this.needsRecheck || (this.state.sensorLocation && this.state.sensorLocation !== sample.sensorLocation))
    ) {
      this.beginCheck(true);
    }

    if (this.check) {
      this.handleCheckSample(sample, common);
      return;
    }

    if (this.calibrator) {
      const status = this.calibrator.feed(sample);
      if (status.result) {
        this.calibrator = null;
        this.applyCalibration(status.result);
      }
      this.set({ ...common, calibrating: status });
      return;
    }

    this.applySnapshot(this.engine.process(sample), common);
  };

  private checkStale = () => {
    if (!this.state.streaming || !this.lastSampleWall) return;
    const silentMs = Date.now() - this.lastSampleWall;
    if (silentMs < STALE_AFTER_MS) return;
    const t = this.lastSampleT + silentMs / 1000;
    if (this.state.session) this.needsRecheck = true;
    this.applySnapshot(this.engine.pause(t, 'disconnected'), { connected: false, sampleRateHz: 0 });
  };

  private applySnapshot(snapshot: PostureSnapshot, patch: Partial<MonitorState>) {
    let session = this.state.session;
    if (session && this.stats) {
      this.stats.add(snapshot.t, snapshot.angle, snapshot.state, snapshot.events);
      const alert = [...snapshot.events].reverse().find((e) => e.type === 'alert');
      session = {
        ...session,
        alertCount: this.stats.liveAlertCount,
        goodRatio: this.stats.goodRatio,
        lastAlert: alert?.type === 'alert' ? { direction: alert.direction, at: Date.now() } : session.lastAlert,
      };
      for (const event of snapshot.events) {
        void deliverFeedback(event, this.state.settings.feedback);
      }
    }
    this.set({ ...patch, snapshot, session });
  }

  // MARK: - Calibration

  startCalibration(): void {
    this.check = null;
    this.pendingCheck = null;
    this.set({ checking: null });
    this.calibrator = new Calibrator();
    this.set({ calibrating: { phase: 'neutral', progress: 0, tooMuchMotion: false, tiltDeg: 0, hint: 'none' } });
    void this.startStreaming();
  }

  cancelCalibration(): void {
    this.calibrator = null;
    this.set({ calibrating: null });
  }

  /** Dismiss the finished calibration screen. */
  finishCalibration(): void {
    this.set({ calibrating: null });
  }

  /** For when the user tilted left instead of right during calibration. */
  async swapLeftRight(): Promise<void> {
    if (this.state.calibration) await this.applyCalibration(flipCalibration(this.state.calibration));
  }

  private async applyCalibration(calibration: Calibration) {
    this.engine.setCalibration(calibration);
    this.set({ calibration, calibrationMismatch: false });
    await storage.saveCalibration(this.source.kind, calibration);
  }

  /** Switch between the phone sensor and demo data (Expo Go). */
  async setSourceKind(kind: MotionSourceKind): Promise<void> {
    if (kind === this.source.kind || this.state.session) return;
    this.cancelCalibration();
    await this.stopStreaming();
    this.source = createMotionSource(kind);
    const calibration = await storage.loadCalibration(this.source.kind);
    this.engine.setCalibration(calibration);
    this.set({
      sourceKind: this.source.kind,
      available: this.source.isAvailable(),
      authorization: this.source.getAuthorizationStatus(),
      calibration,
      calibrationMismatch: false,
      snapshot: null,
      sensorLocation: null,
      error: null,
    });
    await this.updateSettings((prev) => ({ ...prev, source: this.source.kind }));
    await this.startStreaming();
  }

  // MARK: - Session

  // MARK: - Posture check

  private beginCheck(resumed: boolean) {
    if (!this.state.calibration) return;
    this.needsRecheck = false;
    this.pendingCheck = null;
    this.check = new PostureCheck(this.state.calibration);
    this.set({ checking: { progress: 0, tooMuchMotion: false, resumed, largeShiftDeg: null } });
  }

  private handleCheckSample(sample: MotionSample, common: Partial<MonitorState>) {
    const status = this.check!.feed(sample);
    const resumed = this.state.checking?.resumed ?? false;
    if (!status.result) {
      this.set({ ...common, checking: { ...status, resumed, largeShiftDeg: null } });
      return;
    }
    this.check = null;
    // Mid-session the user may not be looking at the screen: apply it and carry on.
    if (!resumed && status.result.shiftDeg > LARGE_SHIFT_DEG) {
      this.pendingCheck = status.result;
      this.set({
        ...common,
        checking: { progress: 1, tooMuchMotion: false, resumed, largeShiftDeg: status.result.shiftDeg },
      });
      return;
    }
    this.set(common);
    void this.applyCheck(status.result);
  }

  /** Start anyway after a large-shift warning. */
  async confirmCheck(): Promise<void> {
    if (this.pendingCheck) await this.applyCheck(this.pendingCheck);
  }

  /** Leave the check screen; ends the session when it was a mid-session re-check. */
  async cancelCheck(): Promise<void> {
    const resumed = this.state.checking?.resumed;
    this.check = null;
    this.pendingCheck = null;
    this.set({ checking: null });
    if (resumed) await this.endSession();
    else await this.releaseSessionResources();
  }

  private async applyCheck(result: NonNullable<PostureCheckStatus['result']>) {
    this.pendingCheck = null;
    // Today's seating only; the stored calibration stays the reference for the next check.
    this.engine.setCalibration(result.calibration);
    this.set({ checking: null });
    if (!this.state.session) this.beginSession();
  }

  // MARK: - Session

  /** Starts with the 5-second posture check; the session itself begins once it passes. */
  async startSession(): Promise<void> {
    if (this.state.session || this.state.checking || !this.state.calibration) return;
    const { feedback } = this.state.settings;
    if (feedback.notification) await requestNotificationPermission().catch(() => false);
    await this.startStreaming();
    if (feedback.backgroundMode) await setBackgroundKeepAlive(true).catch(() => {});
    if (feedback.keepAwake) await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    this.beginCheck(false);
  }

  private beginSession() {
    const startedAt = Date.now();
    const id = startedAt.toString(36);
    this.stats = new SessionStats(id, startedAt);
    this.set({ session: { id, startedAt, alertCount: 0, goodRatio: 1, lastAlert: null } });
  }

  async endSession(): Promise<SessionSummary | null> {
    if (!this.state.session || !this.stats) return null;
    const summary = this.stats.summary(Date.now());
    this.stats = null;
    this.check = null;
    this.pendingCheck = null;
    this.needsRecheck = false;
    this.set({ session: null, checking: null });
    await this.releaseSessionResources();

    // Very short sessions aren't worth keeping.
    if (summary.goodSec + summary.tiltSec < 10) return summary;
    const sessions = await storage.addSession(summary);
    this.set({ sessions });
    return summary;
  }

  private async releaseSessionResources() {
    await setBackgroundKeepAlive(false).catch(() => {});
    await deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    if (AppState.currentState !== 'active') await this.stopStreaming();
  }

  async removeSession(id: string): Promise<void> {
    this.set({ sessions: await storage.deleteSession(id) });
  }

  // MARK: - Settings

  async updateSettings(update: (settings: AppSettings) => AppSettings): Promise<void> {
    const settings = update(this.state.settings);
    this.engine.setSettings(settings.posture);
    this.set({ settings });
    if (this.state.session) {
      await setBackgroundKeepAlive(settings.feedback.backgroundMode).catch(() => {});
    }
    await storage.saveSettings(settings);
  }
}

export const monitor = new MonitorController();

export function useMonitor(): MonitorState {
  return useSyncExternalStore(monitor.subscribe, monitor.getState);
}
