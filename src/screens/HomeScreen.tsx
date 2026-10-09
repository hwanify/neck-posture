import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PostureState } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { Banner } from '../ui/components';
import { PostureDial } from '../ui/PostureDial';
import { colors, pauseLabel, stateColor, stateLabel } from '../ui/theme';

export function HomeScreen() {
  const s = useMonitor();
  const snapshot = s.snapshot;
  const state: PostureState = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const now = useNow(s.session !== null);
  const today = useTodaySummary();
  const { enterDeg } = s.settings.posture;

  const caption =
    state === 'paused'
      ? pauseLabel[s.calibration ? (snapshot?.pauseReason ?? 'disconnected') : 'notCalibrated']
      : stateLabel[state];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{formatToday()}</Text>
        <ConnectionStatus />
      </View>

      {s.sourceKind === 'phone' && <Banner tone="info">Expo Go — iPhone 모션 센서로 테스트 중</Banner>}
      {s.authorization === 'denied' && (
        <Banner tone="danger">
          동작 및 피트니스 권한이 꺼져 있어요.{' '}
          <Text style={{ fontWeight: '700' }} onPress={() => Linking.openSettings()}>
            설정 열기
          </Text>
        </Banner>
      )}
      {s.error && s.authorization !== 'denied' && <Banner tone="warning">{s.error}</Banner>}
      {s.calibrationMismatch && <Banner tone="warning">다른 쪽 이어폰 센서 사용 중 — 다시 보정을 권장해요</Banner>}

      <View style={styles.dial}>
        <PostureDial
          angle={s.calibration && snapshot && state !== 'paused' ? snapshot.angle : null}
          enterDeg={enterDeg}
          color={stateColor[state]}
          caption={caption}
        />
      </View>

      {!s.calibration ? (
        <View style={styles.block}>
          <Text style={styles.blockText}>바른 자세를 한 번 등록하면{'\n'}그 기준으로 측정해요.</Text>
          <ActionButton title="기준 자세 등록" onPress={() => monitor.startCalibration()} />
        </View>
      ) : s.session ? (
        <View style={styles.block}>
          <View style={styles.stats}>
            <Stat value={formatClock((now - s.session.startedAt) / 1000)} label="경과" live />
            <Stat value={`${Math.round(s.session.goodRatio * 100)}%`} label="바른 자세" />
            <Stat value={`${s.session.alertCount}`} label="알림" />
          </View>
          <ActionButton title="종료" variant="secondary" onPress={() => void monitor.endSession()} />
        </View>
      ) : (
        <View style={styles.block}>
          <View style={styles.stats}>
            <Stat value={today.judgedSec > 0 ? `${Math.round(today.goodRatio * 100)}%` : '–'} label="오늘 바른 자세" />
            <Stat value={today.judgedSec > 0 ? formatShort(today.judgedSec) : '–'} label="측정" />
            <Stat value={today.bias} label="기우는 쪽" />
          </View>
          <ActionButton title="측정 시작" onPress={() => void monitor.startSession()} />
        </View>
      )}
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

function Stat({ value, label, live }: { value: string; label: string; live?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <View style={styles.statLabelRow}>
        {live && <View style={styles.liveDot} />}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
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
      <Text style={[styles.actionText, { color: primary ? colors.bg : colors.text }]}>{title}</Text>
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
    left + right < 5 ? '–' : Math.abs(left - right) / (left + right) < 0.2 ? '균형' : left > right ? 'L' : 'R';
  return { judgedSec, goodRatio: judgedSec > 0 ? good / judgedSec : 0, alerts, bias };
}

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function formatShort(sec: number) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
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
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 13, color: colors.subtext, letterSpacing: 0.3 },
  status: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, marginRight: 6 },
  statusText: { fontSize: 12, color: colors.subtext, letterSpacing: 0.3 },
  dial: { alignItems: 'center', marginTop: 48, marginBottom: 36 },
  block: { flex: 1, justifyContent: 'flex-end' },
  blockText: { fontSize: 15, color: colors.subtext, lineHeight: 23, textAlign: 'center', marginBottom: 28 },
  stats: { flexDirection: 'row', marginBottom: 32 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '200', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statLabel: { fontSize: 11, color: colors.subtext, letterSpacing: 0.5 },
  liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.danger, marginRight: 5 },
  action: { borderRadius: 30, paddingVertical: 17, alignItems: 'center' },
  actionPrimary: { backgroundColor: colors.primary },
  actionSecondary: { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.muted },
  actionText: { fontSize: 15, fontWeight: '500', letterSpacing: 0.5 },
});
