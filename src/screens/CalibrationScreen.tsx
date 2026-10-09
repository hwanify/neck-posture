import { StyleSheet, Text, View } from 'react-native';

import { monitor, useMonitor } from '../state/monitor';
import { Button, Card } from '../ui/components';
import { HeadVisual } from '../ui/HeadVisual';
import { colors, formatAngle } from '../ui/theme';

export function CalibrationScreen() {
  const s = useMonitor();
  const status = s.calibrating;
  if (!status) return null;

  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const phone = s.sourceKind === 'phone';

  return (
    <View style={styles.container}>
      <Text style={styles.step}>
        {status.phase === 'neutral' ? '1 / 2' : status.phase === 'tiltRight' ? '2 / 2' : '완료'}
      </Text>

      {status.phase === 'neutral' && (
        <>
          <Text style={styles.title}>{phone ? 'iPhone을 똑바로 세워 들어주세요' : '바른 자세로 정면을 봐주세요'}</Text>
          <Text style={styles.body}>
            {phone
              ? 'iPhone을 세로로 똑바로 세운 채 3초간 가만히 들고 있어주세요. 이 iPhone이 머리 역할을 해요.'
              : '허리를 펴고 고개를 똑바로 세운 채 3초간 가만히 있어주세요.'}
          </Text>
        </>
      )}
      {status.phase === 'tiltRight' && (
        <>
          <Text style={styles.title}>{phone ? 'iPhone을 오른쪽으로 기울여주세요' : '고개를 오른쪽으로 기울여주세요'}</Text>
          <Text style={styles.body}>
            {phone
              ? '화면을 보면서 iPhone 윗부분을 오른쪽으로 15° 정도 천천히 기울이고 잠깐 멈춰주세요.'
              : '오른쪽 귀를 오른쪽 어깨 쪽으로 천천히 기울이고 잠깐 멈춰주세요.'}{' '}
            좌우 방향을 정확히 알기 위한 단계예요.
          </Text>
        </>
      )}
      {status.phase === 'done' && (
        <>
          <Text style={styles.title}>등록 완료!</Text>
          <Text style={styles.body}>
            {phone ? 'iPhone을' : '고개를'} 오른쪽으로 기울이면 &apos;우&apos;, 왼쪽으로 기울이면 &apos;좌&apos;로 표시되는지
            확인해보세요.
          </Text>
        </>
      )}

      <Card style={{ alignItems: 'center', marginTop: 24 }}>
        {status.phase === 'done' ? (
          <>
            <HeadVisual angle={s.snapshot?.angle ?? 0} color={colors.primary} enterDeg={s.settings.posture.enterDeg} />
            <Text style={styles.big}>{formatAngle(s.snapshot?.angle ?? 0)}</Text>
          </>
        ) : (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(status.progress * 100)}%` }]} />
            </View>
            {waiting ? (
              <Text style={styles.warn}>AirPods 신호를 기다리는 중이에요. 양쪽 이어폰을 착용해주세요.</Text>
            ) : status.tooMuchMotion ? (
              <Text style={styles.warn}>움직임이 감지됐어요. 가만히 있어주세요.</Text>
            ) : status.phase === 'tiltRight' ? (
              <Text style={styles.big}>{Math.round(status.tiltDeg)}°</Text>
            ) : null}
          </>
        )}
      </Card>

      <View style={{ flex: 1 }} />
      {status.phase === 'done' ? (
        <>
          <Button title="좌우가 반대예요" variant="secondary" onPress={() => void monitor.swapLeftRight()} />
          <View style={{ height: 10 }} />
          <Button title="완료" onPress={() => monitor.finishCalibration()} />
        </>
      ) : (
        <Button title="취소" variant="secondary" onPress={() => monitor.cancelCalibration()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  step: { fontSize: 14, color: colors.primary, fontWeight: '700', marginTop: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 8 },
  body: { fontSize: 16, color: colors.subtext, marginTop: 10, lineHeight: 23 },
  progressTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.mutedSoft,
    overflow: 'hidden',
    marginVertical: 16,
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  warn: { fontSize: 15, color: colors.warning, textAlign: 'center' },
  big: { fontSize: 36, fontWeight: '800', color: colors.text, marginTop: 8 },
});
