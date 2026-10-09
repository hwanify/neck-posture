import { Pressable, StyleSheet, View } from 'react-native';

import { POSTURE_CHECK_SEC } from '../engine';
import { t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { type } from '../ui/fonts';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

const LINE_WIDTH = 180;

/**
 * Short still check before a session (and after the earbuds are re-seated mid-session).
 * Same layout as the home screen: the level line fills in over the faint horizon as time passes.
 */
export function PostureCheckScreen() {
  const s = useMonitor();
  const check = s.checking;
  if (!check) return null;

  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const largeShift = check.largeShiftDeg !== null;
  const starting = check.starting;
  const seconds = Math.max(0, Math.ceil(POSTURE_CHECK_SEC * (1 - check.progress)));

  const label = starting
    ? t('check.starting')
    : largeShift
      ? t('check.largeShift')
      : check.resumed
        ? t('check.reconnected')
        : t('check.lookAhead');
  const hint = starting
    ? t('check.startingHint')
    : largeShift
      ? t('check.largeShiftHint')
      : waiting
        ? t('check.waiting')
        : check.tooMuchMotion
          ? t('check.motion')
          : t('check.holdHint', { sec: POSTURE_CHECK_SEC });

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Pressable onPress={() => void monitor.cancelCheck()} hitSlop={10}>
          <Text style={styles.meta}>{check.resumed ? t('check.stop') : t('common.cancel')}</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={styles.levelBox}>
          <View style={styles.horizon} />
          <View style={[styles.level, { width: largeShift || starting ? LINE_WIDTH : LINE_WIDTH * check.progress }]} />
          <View style={styles.levelDot} />
        </View>
        <Text style={styles.number}>
          {starting ? t('check.start') : largeShift ? `${Math.round(check.largeShiftDeg!)}°` : seconds}
        </Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.hint, (waiting || check.tooMuchMotion) && { color: colors.text }]}>{hint}</Text>
      </View>

      {largeShift && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => monitor.startCalibration()}
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.buttonText}>{t('check.recalibrate')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void monitor.confirmCheck()} hitSlop={8}>
            <Text style={styles.secondary}>{t('check.startAnyway')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  meta: { ...type.label, fontSize: 13, color: colors.subtext },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  levelBox: { width: 240, height: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  horizon: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.tertiary, opacity: 0.6 },
  level: { position: 'absolute', height: 1.5, borderRadius: 1, backgroundColor: colors.text },
  levelDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.tint },
  number: { ...type.display, color: colors.text, fontVariant: ['tabular-nums'], lineHeight: 44 },
  label: { ...type.label, fontSize: 13, color: colors.text, marginTop: 14 },
  hint: { ...type.label, fontSize: 12, color: colors.subtext, marginTop: 6 },
  actions: { gap: 18, alignItems: 'stretch' },
  button: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { ...type.button, fontSize: 15, color: colors.onText },
  secondary: { ...type.label, fontSize: 13, color: colors.subtext, textAlign: 'center' },
});
