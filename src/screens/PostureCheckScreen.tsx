import { StyleSheet, View } from 'react-native';

import { monitor, useMonitor } from '../state/monitor';
import { Button } from '../ui/components';
import { type } from '../ui/fonts';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

/** 5-second still check before a session (and after the earbuds are re-seated mid-session). */
export function PostureCheckScreen() {
  const s = useMonitor();
  const check = s.checking;
  if (!check) return null;

  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const phone = s.sourceKind === 'phone';
  const largeShift = check.largeShiftDeg !== null;
  const seconds = Math.max(0, Math.ceil(5 * (1 - check.progress)));

  const title = largeShift ? '기준 자세와 많이 달라요' : '정면을 바라봐 주세요';
  const body = largeShift
    ? `${phone ? 'iPhone 위치가' : '에어팟 위치가'} 등록할 때보다 ${Math.round(check.largeShiftDeg!)}° 달라졌어요. 기준 자세를 다시 등록하는 걸 추천해요.`
    : check.resumed
      ? '에어팟이 다시 연결되었어요. 5초간 바른 자세로 멈추면 측정을 이어갑니다.'
      : '측정 전에 5초간 지금 자세를 확인합니다. 바른 자세로 움직이지 마세요.';

  const hint = waiting
    ? 'AirPods 신호를 기다리는 중입니다. 양쪽 이어폰을 착용하세요.'
    : check.tooMuchMotion
      ? '움직임이 감지되었습니다. 처음부터 다시 셉니다.'
      : ' ';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.cancel} onPress={() => void monitor.cancelCheck()}>
          {check.resumed ? '측정 종료' : '취소'}
        </Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      <View style={styles.center}>
        {largeShift ? null : (
          <>
            <Text style={styles.count}>{seconds}</Text>
            <View style={styles.progressBox}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(check.progress * 100)}%` }]} />
              </View>
              <Text style={[styles.hint, (waiting || check.tooMuchMotion) && { color: colors.warning }]}>{hint}</Text>
            </View>
          </>
        )}
      </View>

      {largeShift && (
        <View style={styles.actions}>
          <Button title="다시 등록" onPress={() => monitor.startCalibration()} />
          <Button title="그대로 시작" variant="plain" onPress={() => void monitor.confirmCheck()} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', height: 44 },
  cancel: { ...type.bodyStrong, color: colors.tint },
  title: { ...type.title, color: colors.text, textAlign: 'center', marginTop: 32 },
  body: { ...type.body, lineHeight: 24, color: colors.subtext, textAlign: 'center', marginTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  count: { ...type.display, color: colors.text, fontVariant: ['tabular-nums'], marginBottom: 28 },
  progressBox: { alignSelf: 'stretch', paddingHorizontal: 16 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.fill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.tint },
  hint: { ...type.callout, color: colors.subtext, textAlign: 'center', marginTop: 16 },
  actions: { gap: 4, paddingBottom: 8 },
});
