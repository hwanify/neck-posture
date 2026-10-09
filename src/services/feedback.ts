import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

import HeadphoneMotion from '../../modules/headphone-motion';
import type { PostureEvent } from '../engine';
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

const directionLabel = { left: '왼쪽', right: '오른쪽' } as const;

/** Sound, haptic and notification feedback for posture events. */
export async function deliverFeedback(event: PostureEvent, settings: FeedbackSettings): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (event.type === 'alert') {
    if (settings.sound && HeadphoneMotion) {
      // Cue from the opposite ear: tilted left → sound on the right → move back right.
      const pan = event.direction === 'left' ? 1 : -1;
      tasks.push(HeadphoneMotion.playCue('alert', pan, settings.volume));
    }
    if (settings.haptic && AppState.currentState === 'active') {
      tasks.push(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
    }
    if (settings.notification && AppState.currentState !== 'active') {
      tasks.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: `고개가 ${directionLabel[event.direction]}으로 기울었어요`,
            body: `${Math.round(Math.abs(event.angle))}° 기울어진 상태예요. 고개를 바로 세워주세요.`,
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
