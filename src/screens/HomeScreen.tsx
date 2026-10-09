import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PostureState } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { Banner } from '../ui/components';
import { PostureDial } from '../ui/PostureDial';
import { colors, formatDuration, pauseLabel, stateColor, stateLabel } from '../ui/theme';

export function HomeScreen() {
  const s = useMonitor();
  const snapshot = s.snapshot;
  const state: PostureState = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const now = useNow(s.session !== null);
  const today = useTodaySummary();
  const { enterDeg, holdSec } = s.settings.posture;

  const caption =
    state === 'paused'
      ? pauseLabel[s.calibration ? (snapshot?.pauseReason ?? 'disconnected') : 'notCalibrated']
      : stateLabel[state];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.date}>{formatToday()}</Text>
          <Text style={styles.title}>자세</Text>
        </View>
        <ConnectionStatus />
      </View>

      {s.sourceKind === 'phone' && (
        <Banner tone="info">Expo Go 테스트 모드 — AirPods 대신 iPhone의 모션 센서를 사용해요.</Banner>
      )}
      {s.authorization === 'denied' && (
        <Banner tone="danger">
          동작 및 피트니스 권한이 꺼져 있어요.{' '}
          <Text style={{ fontWeight: '700' }} onPress={() => Linking.openSettings()}>
            설정 열기
          </Text>
        </Banner>
      )}
      {s.error && s.authorization !== 'denied' && <Banner tone="warning">{s.error}</Banner>}
      {s.calibrationMismatch && (
        <Banner tone="warning">보정할 때와 다른 쪽 이어폰 센서가 사용 중이에요. 다시 보정하면 더 정확해요.</Banner>
      )}

      <View style={styles.dialCard}>
        <PostureDial
          angle={s.calibration && snapshot && state !== 'paused' ? snapshot.angle : null}
          enterDeg={enterDeg}
          color={stateColor[state]}
          caption={caption}
        />
        <Text style={styles.dialFootnote}>
          알림 기준 ±{enterDeg}° · {holdSec}초 유지
        </Text>
      </View>

      {!s.calibration ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>기준 자세 등록</Text>
          <Text style={styles.cardBody}>
            {s.sourceKind === 'airpods'
              ? '이어폰이 귀에 걸린 각도는 사람마다 달라요. 바른 자세를 한 번 등록하면 그 기준으로 측정해요.'
              : '바른 자세와 좌우 방향을 한 번 등록하면 그 기준으로 측정해요.'}
          </Text>
          <ActionButton title="등록하기" onPress={() => monitor.startCalibration()} />
        </View>
      ) : s.session ? (
        <View style={styles.card}>
          <View style={styles.sessionHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.sessionLabel}>측정 중</Text>
            <Text style={styles.clock}>{formatClock((now - s.session.startedAt) / 1000)}</Text>
          </View>
          <View style={styles.metrics}>
            <Metric value={`${Math.round(s.session.goodRatio * 100)}`} unit="%" label="바른 자세" />
            <View style={styles.metricDivider} />
            <Metric value={`${s.session.alertCount}`} unit="회" label="알림" />
          </View>
          <ActionButton title="측정 종료" variant="secondary" onPress={() => void monitor.endSession()} />
          <Text style={styles.footnote}>
            {s.settings.feedback.backgroundMode ? '화면이 꺼져도 측정이 계속돼요' : '앱이 열려 있는 동안만 측정해요'}
          </Text>
        </View>
      ) : (
        <ActionButton title="측정 시작" onPress={() => void monitor.startSession()} />
      )}

      <Text style={styles.sectionLabel}>오늘</Text>
      <View style={styles.list}>
        <ListRow label="바른 자세" value={today.judgedSec > 0 ? `${Math.round(today.goodRatio * 100)}%` : '—'}>
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.round(today.goodRatio * 100)}%` }]} />
          </View>
        </ListRow>
        <ListRow label="측정 시간" value={today.judgedSec > 0 ? formatDuration(today.judgedSec) : '—'} />
        <ListRow label="알림" value={`${today.alerts}회`} />
        <ListRow label="주로 기우는 쪽" value={today.bias} last />
      </View>
    </ScrollView>
  );
}

function ConnectionStatus() {
  const s = useMonitor();
  let text: string;
  let tone: string;
  if (s.sourceKind === 'demo') {
    text = '데모';
    tone = colors.warning;
  } else if (s.sourceKind === 'phone') {
    text = s.connected ? 'iPhone 센서' : '센서 대기';
    tone = s.connected ? colors.good : colors.muted;
  } else if (!s.available) {
    text = '미지원 기기';
    tone = colors.danger;
  } else if (s.connected) {
    text = 'AirPods';
    tone = colors.good;
  } else {
    text = 'AirPods 연결 안 됨';
    tone = colors.muted;
  }
  return (
    <View style={styles.status}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

function Metric({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.metricValue}>
        {value}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ListRow({
  label,
  value,
  last,
  children,
}: {
  label: string;
  value: string;
  last?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLine}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      {children}
    </View>
  );
}

function ActionButton({
  title,
  onPress,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionSecondary,
        { opacity: pressed ? 0.7 : 1 },
      ]}>
      <Text style={[styles.actionText, { color: primary ? '#FFFFFF' : colors.text }]}>{title}</Text>
    </Pressable>
  );
}

/** Saved sessions from today plus the one in progress. */
function useTodaySummary() {
  const { sessions, session } = useMonitor();
  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  let good = 0;
  let tilt = 0;
  let left = 0;
  let right = 0;
  let alerts = 0;
  for (const x of sessions.filter((x) => isToday(x.startedAt))) {
    good += x.goodSec;
    tilt += x.tiltSec;
    left += x.leftTiltSec;
    right += x.rightTiltSec;
    alerts += x.alertCount;
  }
  if (session) alerts += session.alertCount;
  const judgedSec = good + tilt;
  const bias =
    left + right < 5 ? '—' : Math.abs(left - right) / (left + right) < 0.2 ? '균형' : left > right ? '왼쪽' : '오른쪽';
  return { judgedSec, goodRatio: judgedSec > 0 ? good / judgedSec : 0, alerts, bias };
}

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h > 0 ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
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
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  date: { fontSize: 13, color: colors.subtext, letterSpacing: 0.2 },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: -0.5, marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', paddingBottom: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 13, color: colors.subtext },
  dialCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 12,
  },
  dialFootnote: { fontSize: 12, color: colors.subtext, marginTop: 4, letterSpacing: 0.2 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 20, marginBottom: 12 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardBody: { fontSize: 14, color: colors.subtext, lineHeight: 21, marginTop: 6, marginBottom: 18 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.danger, marginRight: 8 },
  sessionLabel: { fontSize: 14, color: colors.subtext, flex: 1 },
  clock: { fontSize: 22, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
  metrics: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: 20,
  },
  metricValue: { fontSize: 34, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
  metricUnit: { fontSize: 15, color: colors.subtext },
  metricLabel: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  action: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  actionPrimary: { backgroundColor: colors.primary },
  actionSecondary: { backgroundColor: colors.mutedSoft, marginBottom: 0 },
  actionText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.2 },
  footnote: { fontSize: 12, color: colors.subtext, textAlign: 'center', marginTop: 12 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    marginTop: 16,
    marginBottom: 8,
    marginLeft: 4,
  },
  list: { backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 18 },
  row: { paddingVertical: 15 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { fontSize: 15, color: colors.text },
  rowValue: { fontSize: 15, color: colors.subtext, fontVariant: ['tabular-nums'] },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.mutedSoft, marginTop: 10, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.good, borderRadius: 2 },
});
