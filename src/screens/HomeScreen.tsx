import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { monitor, useMonitor } from '../state/monitor';
import { Banner, Button, Card } from '../ui/components';
import { HeadVisual } from '../ui/HeadVisual';
import { colors, formatAngle, formatDuration, pauseLabel, stateColor, stateLabel } from '../ui/theme';

export function HomeScreen() {
  const s = useMonitor();
  const snapshot = s.snapshot;
  const state = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const color = stateColor[state];
  const angle = snapshot?.angle ?? 0;
  const now = useNow(s.session !== null);

  const label =
    state === 'paused'
      ? `${stateLabel.paused} · ${pauseLabel[s.calibration ? (snapshot?.pauseReason ?? 'disconnected') : 'notCalibrated']}`
      : stateLabel[state];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ConnectionChip />

      {s.authorization === 'denied' && (
        <Banner tone="danger">
          동작 및 피트니스 권한이 꺼져 있어요. 설정 앱에서 바로목의 &apos;동작 및 피트니스&apos;를 켜주세요.{' '}
          <Text style={{ fontWeight: '700' }} onPress={() => Linking.openSettings()}>
            설정 열기 ›
          </Text>
        </Banner>
      )}
      {s.error && s.authorization !== 'denied' && <Banner tone="warning">{s.error}</Banner>}
      {s.calibrationMismatch && (
        <Banner tone="warning">
          보정할 때와 다른 쪽 이어폰의 센서가 사용 중이에요. 다시 보정하면 더 정확해요.
        </Banner>
      )}

      {!s.calibration ? (
        <Card>
          <Text style={styles.title}>먼저 바른 자세를 등록해주세요</Text>
          <Text style={styles.body}>
            AirPods가 귀에 걸린 각도는 사람마다 달라요. 10초 정도면 끝나요.
          </Text>
          <View style={{ height: 12 }} />
          <Button title="자세 보정 시작" onPress={() => monitor.startCalibration()} />
        </Card>
      ) : null}

      <Card style={{ alignItems: 'center' }}>
        <HeadVisual angle={angle} color={color} enterDeg={s.settings.posture.enterDeg} />
        <Text style={[styles.angle, { color }]}>{s.calibration ? formatAngle(angle) : '—'}</Text>
        <Text style={[styles.stateLabel, { color }]}>{label}</Text>
      </Card>

      {s.session ? (
        <Card>
          <Text style={styles.title}>측정 중</Text>
          <View style={styles.statsRow}>
            <Stat label="경과" value={formatDuration((now - s.session.startedAt) / 1000)} />
            <Stat label="바른 자세" value={`${Math.round(s.session.goodRatio * 100)}%`} />
            <Stat label="알림" value={`${s.session.alertCount}회`} />
          </View>
          {s.settings.feedback.backgroundMode ? (
            <Text style={styles.hint}>화면을 끄거나 다른 앱을 써도 계속 감지해요.</Text>
          ) : (
            <Text style={styles.hint}>백그라운드 감지가 꺼져 있어요. 앱을 켜둔 동안만 감지해요.</Text>
          )}
          <View style={{ height: 12 }} />
          <Button title="측정 종료" variant="danger" onPress={() => void monitor.endSession()} />
        </Card>
      ) : (
        <Button
          title="측정 시작"
          disabled={!s.calibration}
          onPress={() => void monitor.startSession()}
        />
      )}
    </ScrollView>
  );
}

function ConnectionChip() {
  const s = useMonitor();
  let text: string;
  let tone: string;
  if (s.sourceKind === 'demo') {
    text = '데모 모드 · 가상 센서 데이터';
    tone = colors.warning;
  } else if (!s.available) {
    text = '헤드폰 모션 미지원 기기';
    tone = colors.danger;
  } else if (s.connected) {
    const ear = s.sensorLocation === 'left' ? ' · 왼쪽 이어폰' : s.sensorLocation === 'right' ? ' · 오른쪽 이어폰' : '';
    text = `AirPods 연결됨${ear}`;
    tone = colors.primary;
  } else {
    text = 'AirPods를 착용해주세요';
    tone = colors.muted;
  }
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Re-renders every second while `active`, for the elapsed-time display. */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  chipText: { fontSize: 14, color: colors.text },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  body: { fontSize: 15, color: colors.subtext, lineHeight: 21 },
  hint: { fontSize: 13, color: colors.subtext, marginTop: 10, textAlign: 'center' },
  angle: { fontSize: 44, fontWeight: '800', marginTop: 4, fontVariant: ['tabular-nums'] },
  stateLabel: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 8 },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: colors.subtext, marginTop: 2 },
});
