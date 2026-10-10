import HeadphoneMotion from '../../modules/headphone-motion';
import { t } from '../i18n';

/**
 * Lock Screen / Dynamic Island card for a running session: the app's mark, "measuring" and a timer
 * iOS counts by itself. Started once and ended once, never updated. No-op in builds without it.
 */
export async function startLiveActivity(startedAt: number): Promise<void> {
  await HeadphoneMotion?.startLiveActivity?.(startedAt, t('liveActivity.title'), t('liveActivity.stop')).catch(
    () => false,
  );
}

export async function endLiveActivity(): Promise<void> {
  await HeadphoneMotion?.endLiveActivity?.().catch(() => {});
}
