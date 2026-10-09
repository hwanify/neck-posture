import { Pressable, StyleSheet, View } from 'react-native';

import { monitor, useMonitor } from '../state/monitor';
import { type } from '../ui/fonts';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

const LINE_WIDTH = 180;

/**
 * 5-second still check before a session (and after the earbuds are re-seated mid-session).
 * Same layout as the home screen: the level line fills in over the faint horizon as time passes.
 */
export function PostureCheckScreen() {
  const s = useMonitor();
  const check = s.checking;
  if (!check) return null;

  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const largeShift = check.largeShiftDeg !== null;
  const seconds = Math.max(0, Math.ceil(5 * (1 - check.progress)));

  const label = largeShift
    ? '등록할 때와 많이 달라요'
    : check.resumed
      ? '에어팟이 다시 연결됐어요'
      : '정면을 바라보고 멈춰 주세요';
  const hint = largeShift
    ? '기준 자세를 다시 등록하는 걸 추천해요'
    : waiting
      ? 'AirPods 신호를 기다리는 중'
      : check.tooMuchMotion
        ? '움직임이 감지되어 다시 셉니다'
        : '바른 자세로 5초간 확인합니다';

  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.meta}>측정 준비</Text>
        <Pressable onPress={() => void monitor.cancelCheck()} hitSlop={10}>
          <Text style={styles.meta}>{check.resumed ? '측정 종료' : '취소'}</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <View style={styles.levelBox}>
          <View style={styles.horizon} />
          <View style={[styles.level, { width: largeShift ? LINE_WIDTH : LINE_WIDTH * check.progress }]} />
          <View style={styles.levelDot} />
        </View>
        <Text style={styles.number}>{largeShift ? `${Math.round(check.largeShiftDeg!)}°` : seconds}</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.hint, (waiting || check.tooMuchMotion) && { color: colors.text }]}>{hint}</Text>
      </View>

      {largeShift && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => monitor.startCalibration()}
            style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.buttonText}>다시 등록</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void monitor.confirmCheck()} hitSlop={8}>
            <Text style={styles.secondary}>그대로 시작</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
