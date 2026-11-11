import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Anonymous usage stats (TelemetryDeck). Signals carry an event name and a few coarse values
 * (buckets, setting names) — never names, device identifiers, location or posture data. The only
 * identifier is a random ID made on first launch, which goes away with the app. Users can turn
 * this off in Settings; without an app ID in app.json (`extra.telemetryDeckAppID`) nothing is sent.
 */

const ENDPOINT = 'https://nom.telemetrydeck.com/v2/';
const INSTALL_KEY = 'baromok.installId';

const randomId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

const appID: string | undefined = Constants.expoConfig?.extra?.telemetryDeckAppID || undefined;
const sessionID = randomId();
let enabled = true;
let installId: Promise<string> | null = null;

export function setAnalyticsEnabled(on: boolean): void {
  enabled = on;
}

function getInstallId(): Promise<string> {
  installId ??= AsyncStorage.getItem(INSTALL_KEY)
    .then(async (saved) => {
      if (saved) return saved;
      const id = randomId();
      await AsyncStorage.setItem(INSTALL_KEY, id);
      return id;
    })
    .catch(() => randomId());
  return installId;
}

/** Fire and forget; never throws and never blocks the caller. */
export function track(type: string, payload: Record<string, string> = {}): void {
  if (!enabled || !appID) return;
  void (async () => {
    try {
      const body = [
        {
          appID,
          clientUser: await getInstallId(),
          sessionID,
          type,
          payload: {
            appVersion: Constants.expoConfig?.version ?? '',
            osVersion: `${Platform.OS} ${Platform.Version}`,
            ...payload,
          },
          ...(__DEV__ ? { isTestMode: true } : {}),
        },
      ];
      await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch {
      // Stats are never worth an error.
    }
  })();
}
