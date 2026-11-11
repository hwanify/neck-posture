import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState } from 'react-native';

import type { SessionSummary } from '../engine';
import { t } from '../i18n';
import { track } from './analytics';
import { REVIEW_MIN_SESSION_SEC } from './reviewPrompt';

const ASKED_KEY = 'baromok.helpfulAsked';
/** Asked once, after the second long session — before the App Store rating can come up. */
export const HELPFUL_MIN_SESSIONS = 2;

const measuredSec = (s: SessionSummary) => s.goodSec + s.tiltSec;

export function shouldAskHelpful(ended: SessionSummary, sessions: SessionSummary[], alreadyAsked: boolean): boolean {
  if (alreadyAsked || measuredSec(ended) < REVIEW_MIN_SESSION_SEC) return false;
  return sessions.filter((s) => measuredSec(s) >= REVIEW_MIN_SESSION_SEC).length >= HELPFUL_MIN_SESSIONS;
}

const REASONS = ['tooOften', 'inaccurate', 'battery', 'setup', 'other'] as const;

/**
 * "Is Plumb helping?" 👍 / 👎, and on 👎 one tap for why. The answer only goes to the anonymous
 * stats; it never decides whether the App Store rating sheet is shown. Resolves to whether it asked.
 */
export async function maybeAskHelpful(ended: SessionSummary, sessions: SessionSummary[]): Promise<boolean> {
  try {
    if (AppState.currentState !== 'active') return false;
    const asked = (await AsyncStorage.getItem(ASKED_KEY)) === '1';
    if (!shouldAskHelpful(ended, sessions, asked)) return false;
    await AsyncStorage.setItem(ASKED_KEY, '1');
    await new Promise((resolve) => setTimeout(resolve, 800));
    Alert.alert(t('helpful.title'), t('helpful.message'), [
      { text: t('helpful.later'), style: 'cancel', onPress: () => track('Feedback.helpful', { answer: 'later' }) },
      { text: t('helpful.no'), onPress: askWhy },
      { text: t('helpful.yes'), onPress: () => track('Feedback.helpful', { answer: 'yes' }) },
    ]);
    return true;
  } catch {
    return false;
  }
}

function askWhy() {
  Alert.alert(t('helpful.reasonTitle'), undefined, [
    ...REASONS.map((reason) => ({
      text: t(`helpful.reason.${reason}`),
      onPress: () => track('Feedback.helpful', { answer: 'no', reason }),
    })),
    { text: t('common.cancel'), style: 'cancel' as const, onPress: () => track('Feedback.helpful', { answer: 'no' }) },
  ]);
}
