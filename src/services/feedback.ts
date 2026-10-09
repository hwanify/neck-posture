import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import HeadphoneMotion from '../../modules/headphone-motion';
import type { PostureEvent } from '../engine';
import { t } from '../i18n';
import type { FeedbackSettings } from './storage';

Notifications.setNotificationHandler({
  // While the app is open the on-screen state and sound are enough.
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

/** Sound, haptic and notification feedback for posture events. */
export async function deliverFeedback(event: PostureEvent, settings: FeedbackSettings): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (event.type === 'alert') {
    if (settings.sound && HeadphoneMotion) {
      // Default: sound in the ear the head tilts towards; optionally the opposite ear.
      const tiltedPan = event.direction === 'left' ? -1 : 1;
      const pan = settings.cueSide === 'opposite' ? -tiltedPan : tiltedPan;
      tasks.push(HeadphoneMotion.playCue('alert', pan, settings.volume));
    }
    if (settings.haptic && AppState.currentState === 'active') {
      tasks.push(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    }
    if (settings.notification && AppState.currentState !== 'active') {
      tasks.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: t(event.direction === 'left' ? 'notification.titleLeft' : 'notification.titleRight'),
            body: t('notification.body', { deg: Math.round(Math.abs(event.angle)) }),
            sound: !settings.sound,
          },
          trigger: null,
        }),
      );
    }
  } else if (event.afterAlert && settings.recoveryChime && settings.sound && HeadphoneMotion) {
    tasks.push(HeadphoneMotion.playCue('good', 0, settings.volume * 0.7));
  }

  await Promise.allSettled(tasks);
}

export async function playTestCue(kind: 'alert' | 'good', pan: number, volume: number): Promise<boolean> {
  if (!HeadphoneMotion) return false;
  await HeadphoneMotion.playCue(kind, pan, volume);
  return true;
}

export async function setBackgroundKeepAlive(enabled: boolean): Promise<void> {
  await HeadphoneMotion?.setBackgroundKeepAlive(enabled);
}
