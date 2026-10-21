import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, loadSettings } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../motionSource', () => ({ selectableSourceKinds: ['airpods'] }));

const SETTINGS_KEY = 'baromok.settings.v1';

describe('settings defaults migration', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('gives existing users the current alert defaults once, keeping their other choices', async () => {
    const old = {
      ...DEFAULT_SETTINGS,
      posture: { ...DEFAULT_SETTINGS.posture, enterDeg: 12, exitDeg: 9, holdSec: 10, cooldownSec: 60, measureWhileWalking: false },
      feedback: { ...DEFAULT_SETTINGS.feedback, volume: 0.4, sound: false, cueSide: 'opposite' as const },
      language: 'ja' as const,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(old));

    const migrated = await loadSettings();
    expect(migrated.posture).toMatchObject({ enterDeg: 5, exitDeg: 2, holdSec: 2, cooldownSec: 5, measureWhileWalking: true });
    expect(migrated.feedback).toMatchObject({ volume: 1, sound: true, cueSide: 'opposite' });
    expect(migrated.language).toBe('ja');

    // Changes made after the migration stick.
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...migrated, posture: { ...migrated.posture, holdSec: 1 } }));
    expect((await loadSettings()).posture.holdSec).toBe(1);
  });

  it('leaves a fresh install on the defaults', async () => {
    const settings = await loadSettings();
    expect(settings.posture.enterDeg).toBe(5);
    expect(settings.feedback.volume).toBe(1);
    expect((await loadSettings()).posture.holdSec).toBe(2);
  });
});
