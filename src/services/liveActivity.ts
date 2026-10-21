import HeadphoneMotion from '../../modules/headphone-motion';
import { t } from '../i18n';

/**
 * Lock Screen / Dynamic Island card for a running session: the app's mark, "measuring" and a timer
 * iOS counts by itself. Started once and ended once, never updated. No-op in builds without it.
 */
export async function startLiveActivity(startedAt: number): Promise<void> {
  if (!HeadphoneMotion?.startLiveActivity) return;
  try {
    await HeadphoneMotion.startLiveActivity(startedAt, t('liveActivity.title'), t('liveActivity.stop'));
  } catch {
    // Builds before 1.0.2 take (startedAt, title) only, and an OTA update can run on them. The
    // argument-count error may be thrown synchronously, so it's caught here rather than with .catch.
    const legacy = HeadphoneMotion.startLiveActivity as unknown as (startedAt: number, title: string) => Promise<boolean>;
    try {
      await legacy.call(HeadphoneMotion, startedAt, t('liveActivity.title'));
    } catch {
      // Live Activities off or unavailable: the session runs without the card.
    }
  }
}

export async function endLiveActivity(): Promise<void> {
  try {
    await HeadphoneMotion?.endLiveActivity?.();
  } catch {
    // Nothing to end.
  }
}
