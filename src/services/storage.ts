import AsyncStorage from '@react-native-async-storage/async-storage';

import { type Calibration, DEFAULT_POSTURE_SETTINGS, type PostureSettings, type SessionSummary } from '../engine';

export type FeedbackSettings = {
  sound: boolean;
  haptic: boolean;
  notification: boolean;
  /** Play a soft chime when posture recovers after an alert. */
  recoveryChime: boolean;
  volume: number;
  /** Keep monitoring while the app is in the background (plays inaudible audio). */
  backgroundMode: boolean;
  /** Keep the screen awake during a session. */
  keepAwake: boolean;
};

export type AppSettings = {
  posture: PostureSettings;
  feedback: FeedbackSettings;
};

export const DEFAULT_SETTINGS: AppSettings = {
  posture: DEFAULT_POSTURE_SETTINGS,
  feedback: {
    sound: true,
    haptic: true,
    notification: true,
    recoveryChime: true,
    volume: 0.6,
    backgroundMode: true,
    keepAwake: false,
  },
};

const KEYS = {
  settings: 'baromok.settings.v1',
  calibration: 'baromok.calibration.v1',
  sessions: 'baromok.sessions.v1',
  onboarded: 'baromok.onboarded.v1',
};

const MAX_SESSIONS = 200;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const writeJson = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value));

export async function loadSettings(): Promise<AppSettings> {
  const saved = await readJson<Partial<AppSettings>>(KEYS.settings);
  return {
    posture: { ...DEFAULT_SETTINGS.posture, ...saved?.posture },
    feedback: { ...DEFAULT_SETTINGS.feedback, ...saved?.feedback },
  };
}

export const saveSettings = (settings: AppSettings) => writeJson(KEYS.settings, settings);

export const loadCalibration = () => readJson<Calibration>(KEYS.calibration);
export const saveCalibration = (calibration: Calibration) => writeJson(KEYS.calibration, calibration);

/** Newest first. */
export async function loadSessions(): Promise<SessionSummary[]> {
  return (await readJson<SessionSummary[]>(KEYS.sessions)) ?? [];
}

export async function addSession(session: SessionSummary): Promise<SessionSummary[]> {
  const sessions = [session, ...(await loadSessions())].slice(0, MAX_SESSIONS);
  await writeJson(KEYS.sessions, sessions);
  return sessions;
}

export async function deleteSession(id: string): Promise<SessionSummary[]> {
  const sessions = (await loadSessions()).filter((s) => s.id !== id);
  await writeJson(KEYS.sessions, sessions);
  return sessions;
}

export const loadOnboarded = async () => (await AsyncStorage.getItem(KEYS.onboarded)) === '1';
export const saveOnboarded = () => AsyncStorage.setItem(KEYS.onboarded, '1');
