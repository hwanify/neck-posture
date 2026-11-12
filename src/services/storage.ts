import AsyncStorage from '@react-native-async-storage/async-storage';

import { type Calibration, DEFAULT_POSTURE_SETTINGS, type PostureSettings, type SessionSummary } from '../engine';
import { LANGUAGES, type LanguageSetting } from '../i18n';
import { type MotionSourceKind, selectableSourceKinds } from './motionSource';

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
  /** Which ear plays the alert: the side the head tilts to, or the opposite side. */
  cueSide: 'tilted' | 'opposite';
  /** Show "measuring" with a timer on the Lock Screen / Dynamic Island during a session. */
  liveActivity: boolean;
};

export type AppSettings = {
  posture: PostureSettings;
  feedback: FeedbackSettings;
  /** Preferred sensor when several are available (Expo Go: phone or demo). */
  source: MotionSourceKind;
  /** UI language; 'system' follows the iPhone (English when unsupported). */
  language: LanguageSetting;
};

export const DEFAULT_SETTINGS: AppSettings = {
  posture: DEFAULT_POSTURE_SETTINGS,
  feedback: {
    sound: true,
    haptic: true,
    notification: true,
    recoveryChime: true,
    volume: 1,
    backgroundMode: true,
    keepAwake: false,
    cueSide: 'tilted',
    liveActivity: true,
  },
  source: selectableSourceKinds[0],
  language: 'system',
};

const KEYS = {
  settings: 'baromok.settings.v1',
  calibration: 'baromok.calibration.v1',
  sessions: 'baromok.sessions.v1',
  onboarded: 'baromok.onboarded.v1',
  defaultsVersion: 'baromok.defaultsVersion',
};

/**
 * Bump when the recommended alert settings change and existing users should get them too. On the
 * next launch their alert angle, hold time, interval, walking and sound settings are reset to the
 * defaults once; everything else they chose (language, ear, background mode, …) is kept.
 */
const DEFAULTS_VERSION = 1;

function withCurrentDefaults(settings: AppSettings): AppSettings {
  const p = DEFAULT_SETTINGS.posture;
  const f = DEFAULT_SETTINGS.feedback;
  return {
    ...settings,
    posture: {
      ...settings.posture,
      enterDeg: p.enterDeg,
      exitDeg: p.exitDeg,
      holdSec: p.holdSec,
      cooldownSec: p.cooldownSec,
      measureWhileWalking: p.measureWhileWalking,
    },
    feedback: {
      ...settings.feedback,
      sound: f.sound,
      haptic: f.haptic,
      recoveryChime: f.recoveryChime,
      volume: f.volume,
    },
  };
}

const MAX_SESSIONS = 1000;

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
  const settings = mergeSaved(saved);
  const applied = Number((await AsyncStorage.getItem(KEYS.defaultsVersion).catch(() => null)) ?? 0);
  if (applied >= DEFAULTS_VERSION) return settings;
  const next = saved ? withCurrentDefaults(settings) : settings;
  try {
    if (saved) await saveSettings(next);
    await AsyncStorage.setItem(KEYS.defaultsVersion, String(DEFAULTS_VERSION));
  } catch {
    // Try again next launch.
  }
  return next;
}

function mergeSaved(saved: Partial<AppSettings> | null): AppSettings {
  return {
    posture: { ...DEFAULT_SETTINGS.posture, ...saved?.posture },
    feedback: { ...DEFAULT_SETTINGS.feedback, ...saved?.feedback },
    source: saved?.source && selectableSourceKinds.includes(saved.source) ? saved.source : DEFAULT_SETTINGS.source,
    language:
      saved?.language === 'system' || LANGUAGES.some((l) => l.code === saved?.language)
        ? saved!.language!
        : DEFAULT_SETTINGS.language,
  };
}

export const saveSettings = (settings: AppSettings) => writeJson(KEYS.settings, settings);

// Each sensor has its own frame, so calibrations are kept per source.
export const loadCalibration = (source: MotionSourceKind) => readJson<Calibration>(`${KEYS.calibration}.${source}`);
export const saveCalibration = (source: MotionSourceKind, calibration: Calibration) =>
  writeJson(`${KEYS.calibration}.${source}`, calibration);

/** Newest first. */
/** Sessions older than this are dropped when loading or saving. */
const RETENTION_DAYS = 90;

const recent = (sessions: SessionSummary[]) => {
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 3600 * 1000;
  return sessions.filter((s) => s.startedAt >= cutoff);
};

export async function loadSessions(): Promise<SessionSummary[]> {
  return recent((await readJson<SessionSummary[]>(KEYS.sessions)) ?? []);
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
