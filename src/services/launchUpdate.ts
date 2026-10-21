import * as Updates from 'expo-updates';

/** How long a launch may wait for a newer update before starting on what it has. */
const WAIT_MS = 4000;

/**
 * True when this launch runs the code built into the app (fresh install, or the first launch after an
 * App Store update) and a newer OTA update could be waiting. Later launches already run the latest
 * downloaded update, so they skip the check.
 */
export const shouldCheckForUpdateAtLaunch = (): boolean => Updates.isEnabled && Updates.isEmbeddedLaunch;

/**
 * Downloads a newer update and restarts into it, so even the first launch after installing runs the
 * latest JS. Gives up after WAIT_MS (offline, slow network): the app starts normally and the update,
 * if it finishes downloading, applies on the next launch as usual. Resolves only when not restarting.
 */
export async function applyUpdateAtLaunch(): Promise<void> {
  try {
    const fetched = await Promise.race([
      (async () => {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return false;
        const result = await Updates.fetchUpdateAsync();
        return result.isNew;
      })(),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), WAIT_MS)),
    ]);
    if (fetched) await Updates.reloadAsync();
  } catch {
    // No network or no update server: start on the built-in code.
  }
}
