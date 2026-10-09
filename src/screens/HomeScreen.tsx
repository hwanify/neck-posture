import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PostureState } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { GradientCard } from '../ui/GradientCard';
import { colors, pauseLabel, stateGradient } from '../ui/theme';

const HEADLINE: Record<PostureState, string> = {
  good: '바른 자세\n유지 중',
  tilting: '조금\n기울었어요',
  alerted: '고개를\n세워주세요',
  paused: '잠시\n쉬는 중',
};

export function HomeScreen() {
  const s = useMonitor();
  const snapshot = s.snapshot;
  const state: PostureState = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const live = s.calibration && snapshot && state !== 'paused';
  const angle = live ? snapshot.angle : 0;
  const abs = Math.round(Math.abs(angle));
  const now = useNow(s.session !== null);
  const today = useTodaySummary();

  const headline = !s.calibration ? '기준 자세를\n등록하세요' : HEADLINE[state];
  const sub = !live
    ? pauseLabel[s.calibration ? (snapshot?.pauseReason ?? 'disconnected') : 'notCalibrated']
    : abs === 0
      ? '정면'
      : angle < 0
        ? '왼쪽으로 기울어짐'
        : '오른쪽으로 기울어짐';

  const notice =
    s.authorization === 'denied'
      ? '동작 및 피트니스 접근을 허용해 주세요'
      : s.error
        ? s.error
        : s.calibrationMismatch
          ? '다른 쪽 이어폰 센서 사용 중 · 다시 등록 권장'
          : null;

  const ratio = s.session ? s.session.goodRatio : today.judgedSec > 0 ? today.goodRatio : null;
  const alerts = s.session ? s.session.alertCount : today.alerts;
  const time = s.session
    ? formatClock((now - s.session.startedAt) / 1000)
    : today.judgedSec > 0
      ? formatShort(today.judgedSec)
      : '–';

  return (
    <View style={styles.screen}>
      <GradientCard
        vertical
        colors={[colors.bg, stateGradient[state][0], stateGradient[state][1], colors.bg]}
        style={styles.backdrop}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.top}>
          <Text style={styles.meta}>{formatToday()}</Text>
          <ConnectionStatus />
        </View>

        <Text style={styles.headline}>{headline}</Text>
        {notice && (
          <Text
            style={styles.notice}
            onPress={s.authorization === 'denied' ? () => Linking.openSettings() : undefined}>
            {notice}
          </Text>
        )}

        <View style={styles.center}>
          <View style={[styles.level, { transform: [{ rotate: `${Math.max(-30, Math.min(30, angle))}deg` }] }]}>
            <View style={styles.levelDot} />
          </View>
          <Text style={styles.angle}>{live ? `${abs}°` : '–'}</Text>
          <Text style={styles.angleLabel}>{sub}</Text>
        </View>

        <View style={styles.stats}>
          <Stat value={ratio === null ? '–' : `${Math.round(ratio * 100)}%`} label="바른 자세" />
          <Stat value={`${alerts}`} label="알림" />
          <Stat value={time} label={s.session ? '경과' : '오늘 측정'} />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            !s.calibration
              ? monitor.startCalibration()
              : s.session
                ? void monitor.endSession()
                : void monitor.startSession()
          }
          style={({ pressed }) => [styles.button, { opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.buttonText}>{!s.calibration ? '기준 자세 등록' : s.session ? '측정 종료' : '측정 시작'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ConnectionStatus() {
  const s = useMonitor();
  const [text, tone] =
    s.sourceKind === 'demo'
      ? ['데모', colors.warning]
      : s.sourceKind === 'phone'
        ? [s.connected ? 'iPhone 센서' : '대기 중', s.connected ? colors.good : colors.muted]
        : !s.available
          ? ['지원 안 됨', colors.danger]
          : s.connected
            ? ['AirPods', colors.good]
            : ['연결 안 됨', colors.muted];
  return (
    <View style={styles.status}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text style={styles.meta}>{text}</Text>
    </View>
  );
}

/** Saved sessions from today plus the one in progress. */
function useTodaySummary() {
  const { sessions, session } = useMonitor();
  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  let good = 0;
  let tilt = 0;
  let alerts = 0;
  for (const x of sessions.filter((x) => isToday(x.startedAt))) {
    good += x.goodSec;
    tilt += x.tiltSec;
    alerts += x.alertCount;
  }
  if (session) alerts += session.alertCount;
  const judgedSec = good + tilt;
  return { judgedSec, goodRatio: judgedSec > 0 ? good / judgedSec : 0, alerts };
}

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
}

function formatShort(sec: number) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
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
  screen: { flex: 1, backgroundColor: colors.bg },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 0 },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { fontSize: 14, color: colors.subtext, fontWeight: '500' },
  status: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  headline: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1.2,
    marginTop: 22,
  },
  notice: { fontSize: 14, color: colors.danger, marginTop: 8 },
  center: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center' },
  level: { width: 220, height: 2, borderRadius: 1, backgroundColor: colors.text, alignItems: 'center', marginBottom: 40 },
  levelDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.text, marginTop: -5 },
  angle: { fontSize: 88, fontWeight: '800', color: colors.text, letterSpacing: -4, fontVariant: ['tabular-nums'] },
  angleLabel: { fontSize: 16, fontWeight: '600', color: colors.subtext, marginTop: -4 },
  stats: { flexDirection: 'row', marginBottom: 28 },
  stat: { flex: 1 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13, fontWeight: '600', color: colors.subtext, marginTop: 2 },
  button: { height: 60, borderRadius: 30, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
