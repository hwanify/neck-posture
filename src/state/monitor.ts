import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { AppState, type AppStateStatus } from 'react-native';
import { useSyncExternalStore } from 'react';

import type { AuthorizationStatus, MotionSample } from '../../modules/headphone-motion';
import {
  type Calibration,
  Calibrator,
  type CalibratorStatus,
  flipCalibration,
  PostureEngine,
  type PostureSnapshot,
  type SensorLocation,
  SessionStats,
  type SessionSummary,
  type TiltDirection,
} from '../engine';
import { deliverFeedback, requestNotificationPermission, setBackgroundKeepAlive } from '../services/feedback';
import { createMotionSource } from '../services/motionSource';
import * as storage from '../services/storage';
import type { AppSettings } from '../services/storage';

/** No samples for this long → treat the earbuds as disconnected / removed. */
const STALE_AFTER_MS = 2000;
const KEEP_AWAKE_TAG = 'baromok-session';

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
  sourceKind: 'airpods' | 'demo';
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
  session: LiveSession | null;
  settings: AppSettings;
  sessions: SessionSummary[];
};

class MonitorController {
  private source = createMotionSource();
  private engine = new PostureEngine(null, storage.DEFAULT_SETTINGS.posture);
  private calibrator: Calibrator | null = null;
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
    const [settings, calibration, sessions, onboarded] = await Promise.all([
      storage.loadSettings(),
      storage.loadCalibration(),
      storage.loadSessions(),
      storage.loadOnboarded(),
    ]);
    this.engine = new PostureEngine(calibration, settings.posture);
    this.set({ loaded: true, settings, calibration, sessions, onboarded });

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
        onError: (e) =>
          this.set({ error: e.message, authorization: this.source.getAuthorizationStatus() }),
      });
      this.set({ streaming: true, error: null, authorization: this.source.getAuthorizationStatus() });
      this.watchdog ??= setInterval(this.checkStale, 1000);
    } catch (e) {
      this.set({ error: e instanceof Error ? e.message : String(e) });
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
    this.calibrator = new Calibrator();
    this.set({ calibrating: { phase: 'neutral', progress: 0, tooMuchMotion: false, tiltDeg: 0 } });
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
    await storage.saveCalibration(calibration);
  }

  // MARK: - Session

  async startSession(): Promise<void> {
    if (this.state.session || !this.state.calibration) return;
    const { feedback } = this.state.settings;
    if (feedback.notification) await requestNotificationPermission().catch(() => false);
    await this.startStreaming();
    if (feedback.backgroundMode) await setBackgroundKeepAlive(true).catch(() => {});
    if (feedback.keepAwake) await activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});

    const startedAt = Date.now();
    const id = startedAt.toString(36);
    this.stats = new SessionStats(id, startedAt);
    this.set({ session: { id, startedAt, alertCount: 0, goodRatio: 1, lastAlert: null } });
  }

  async endSession(): Promise<SessionSummary | null> {
    if (!this.state.session || !this.stats) return null;
    const summary = this.stats.summary(Date.now());
    this.stats = null;
    this.set({ session: null });
    await setBackgroundKeepAlive(false).catch(() => {});
    await deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    if (AppState.currentState !== 'active') await this.stopStreaming();

    // Very short sessions aren't worth keeping.
    if (summary.goodSec + summary.tiltSec < 10) return summary;
    const sessions = await storage.addSession(summary);
    this.set({ sessions });
    return summary;
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
