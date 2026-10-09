import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { PostureState } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { GradientCard } from '../ui/GradientCard';
import { colors, pastel, pauseLabel, stateGradient } from '../ui/theme';

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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <View style={styles.top}>
        <Text style={styles.date}>{formatToday()}</Text>
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

      <GradientCard colors={stateGradient[state]} style={styles.hero}>
        <View style={styles.levelBox}>
          <View style={[styles.level, { transform: [{ rotate: `${Math.max(-30, Math.min(30, angle))}deg` }] }]}>
            <View style={styles.levelDot} />
          </View>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroValue}>{live ? `${abs}°` : '–'}</Text>
          <Text style={styles.heroLabel}>{sub}</Text>
        </View>
      </GradientCard>

      <View style={styles.tiles}>
        <GradientCard colors={pastel.peach} style={styles.tile}>
          <Text style={styles.tileLabel}>{s.session ? '이번 측정' : '오늘'}</Text>
          <View>
            <Text style={styles.tileValue}>
              {s.session
                ? `${Math.round(s.session.goodRatio * 100)}%`
                : today.judgedSec > 0
                  ? `${Math.round(today.goodRatio * 100)}%`
                  : '–'}
            </Text>
            <Text style={styles.tileCaption}>바른 자세</Text>
          </View>
        </GradientCard>
        <GradientCard colors={pastel.sage} style={styles.tile}>
          <Text style={styles.tileLabel}>{s.session ? '이번 측정' : '오늘'}</Text>
          <View>
            <Text style={styles.tileValue}>{s.session ? s.session.alertCount : today.alerts}</Text>
            <Text style={styles.tileCaption}>알림</Text>
          </View>
        </GradientCard>
      </View>

      <View style={styles.actions}>
        <View style={[styles.pill, styles.pillSoft]}>
          <Text style={styles.pillSoftText}>
            {s.session
              ? formatClock((now - s.session.startedAt) / 1000)
              : today.judgedSec > 0
                ? formatShort(today.judgedSec)
                : `±${s.settings.posture.enterDeg}°`}
          </Text>
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
          style={({ pressed }) => [styles.pill, styles.pillDark, { opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.pillDarkText}>{!s.calibration ? '등록하기' : s.session ? '종료' : '측정 시작'}</Text>
        </Pressable>
      </View>
    </ScrollView>
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
      <Text style={styles.date}>{text}</Text>
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
  screen: { backgroundColor: colors.bg },
  container: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 14, color: colors.subtext, fontWeight: '500' },
  status: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  headline: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1.2,
    marginTop: 22,
    marginBottom: 22,
  },
  notice: { fontSize: 14, color: colors.danger, marginTop: -10, marginBottom: 16 },
  hero: { height: 240, padding: 24, justifyContent: 'space-between' },
  levelBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  level: { width: 150, height: 2, borderRadius: 1, backgroundColor: 'rgba(20,20,20,0.75)', alignItems: 'center' },
  levelDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.text, marginTop: -4 },
  heroBottom: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  heroValue: { fontSize: 56, fontWeight: '800', color: colors.text, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  heroLabel: { fontSize: 15, fontWeight: '600', color: 'rgba(20,20,20,0.6)' },
  tiles: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tile: { flex: 1, height: 150, padding: 20, justifyContent: 'space-between' },
  tileLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(20,20,20,0.5)' },
  tileValue: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  tileCaption: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  pill: { flex: 1, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  pillSoft: { backgroundColor: colors.fill },
  pillSoftText: { fontSize: 18, fontWeight: '700', color: colors.text, fontVariant: ['tabular-nums'], letterSpacing: 0.5 },
  pillDark: { backgroundColor: colors.text },
  pillDarkText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
});
